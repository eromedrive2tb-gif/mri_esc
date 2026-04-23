-- =============================================================
--  mri_esc — VIP Manager Module (Server)
--  Background: criação de tabela, expiração, paycheck tracker,
--  validação de login e callbacks admin.
--
--  NOTA: getVipData está em script/server-side/server.lua.
--  Este módulo NÃO registra getVipData para evitar duplicação.
-- =============================================================

local paycheckInterval = 30
local intervalMs       = paycheckInterval * 60 * 1000

-- ─────────────────────────────────────────────────────────────
--  AGUARDA MYSQL ESTAR DISPONÍVEL (sem travar o carregamento)
-- ─────────────────────────────────────────────────────────────
local mysqlReady = false

CreateThread(function()
    local attempts = 0
    while attempts < 20 do
        if MySQL and MySQL.query then
            mysqlReady = true
            break
        end
        Wait(500)
        attempts = attempts + 1
    end

    if not mysqlReady then
        print("[VIP Manager] AVISO: MySQL não disponível. Recursos do DB desativados.")
        return
    end

    -- Cria tabela
    local ok, err = pcall(function()
        MySQL.query([[
            CREATE TABLE IF NOT EXISTS `mri_vip_records` (
                `citizenid`      VARCHAR(50)   NOT NULL,
                `tier`           VARCHAR(50)   NOT NULL DEFAULT 'tier1',
                `granted_at`     INT(11)       NOT NULL DEFAULT 0,
                `expires_at`     INT(11)       DEFAULT NULL,
                `total_earned`   BIGINT        DEFAULT 0,
                `paycheck_count` INT           DEFAULT 0,
                `granted_by`     VARCHAR(100)  DEFAULT 'system',
                `updated_at`     INT(11)       DEFAULT NULL,
                PRIMARY KEY (`citizenid`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ]])
    end)
    if ok then
        print("[VIP Manager] Tabela mri_vip_records verificada/criada.")
    else
        print("[VIP Manager] Erro ao criar tabela: " .. tostring(err))
    end

    -- Verificação imediata de expirados ao iniciar
    Wait(1000)
    local expOk, expired = pcall(function()
        return MySQL.query.await([[
            SELECT citizenid, tier, expires_at
            FROM mri_vip_records
            WHERE expires_at IS NOT NULL AND expires_at <= ?
        ]], { os.time() })
    end)

    if expOk and expired and #expired > 0 then
        print(("[VIP Manager] %d VIP(s) expirado(s) ao iniciar."):format(#expired))
        for _, r in ipairs(expired) do
            pcall(RevokeVip, r.citizenid, 'expired')
        end
    end
end)

-- ─────────────────────────────────────────────────────────────
--  HELPERS
-- ─────────────────────────────────────────────────────────────

local function GetVipConfigs()
    local ok, cfg = pcall(function() return exports.mri_Qbox:GetVipConfig() end)
    if ok and cfg then return cfg end
    return {
        nenhum = { label = "Sem VIP",  payment = 0,    inventory = 100 },
        tier1  = { label = "Tier 1",   payment = 5000, inventory = 200 },
    }
end

local function GetOnlineSource(citizenId)
    local ok, player = pcall(function()
        return exports.qbx_core:GetPlayerByCitizenId(citizenId)
    end)
    if ok and player and player.PlayerData then
        return player.PlayerData.source
    end
    return nil
end

local function Notify(src, ntype, msg)
    if not src or src <= 0 then return end
    pcall(function()
        lib.notify(src, { title = "VIP", type = ntype, description = msg })
    end)
end

-- ─────────────────────────────────────────────────────────────
--  GRANT VIP
-- ─────────────────────────────────────────────────────────────

RevokeVip = function(citizenId, reason) end  -- forward declaration

GrantVip = function(citizenId, tier, durationDays, grantedBy)
    if not citizenId or not tier then return false, "Parâmetros inválidos" end

    local now       = os.time()
    local expiresAt = nil
    durationDays    = tonumber(durationDays)
    if durationDays and durationDays > 0 then
        expiresAt = now + (durationDays * 86400)
    end

    -- Aplica online
    local onlineSrc = GetOnlineSource(citizenId)
    if onlineSrc then
        pcall(function()
            local player = exports.qbx_core:GetPlayer(onlineSrc)
            if player then
                player.Functions.SetMetaData('vip', tier)
                lib.addPrincipal(onlineSrc, tier)
                local cfg = GetVipConfigs()
                if cfg[tier] and cfg[tier].inventory then
                    exports.ox_inventory:SetMaxWeight(onlineSrc, cfg[tier].inventory * 1000)
                end
                Notify(onlineSrc, "success", ("Você recebeu o VIP %s!"):format(tier))
            end
        end)
    else
        -- Aplica offline
        pcall(function()
            local off = exports.qbx_core:GetOfflinePlayer(citizenId)
            if off then
                off.PlayerData.metadata['vip'] = tier
                exports.qbx_core:SaveOffline(off.PlayerData)
            end
        end)
    end

    if mysqlReady then
        pcall(function()
            MySQL.query([[
                INSERT INTO mri_vip_records (citizenid, tier, granted_at, expires_at, granted_by, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    tier = VALUES(tier), granted_at = VALUES(granted_at),
                    expires_at = VALUES(expires_at), granted_by = VALUES(granted_by),
                    updated_at = VALUES(updated_at)
            ]], { citizenId, tier, now, expiresAt, grantedBy or 'system', now })
        end)
    end

    print(("[VIP Manager] VIP '%s' concedido a '%s' (expira: %s)"):format(
        tier, citizenId,
        expiresAt and os.date("%d/%m/%Y", expiresAt) or "Permanente"
    ))
    return true
end

-- ─────────────────────────────────────────────────────────────
--  REVOKE VIP
-- ─────────────────────────────────────────────────────────────

RevokeVip = function(citizenId, reason)
    if not citizenId then return false end

    local onlineSrc = GetOnlineSource(citizenId)
    if onlineSrc then
        pcall(function()
            local player = exports.qbx_core:GetPlayer(onlineSrc)
            if player then
                local oldTier = player.PlayerData.metadata['vip']
                if oldTier then lib.removePrincipal(onlineSrc, oldTier) end
                player.Functions.SetMetaData('vip', nil)
                exports.ox_inventory:SetMaxWeight(onlineSrc, 100 * 1000)
                if reason == 'expired' then
                    Notify(onlineSrc, "warning", "Seu VIP expirou. Renove para continuar aproveitando os benefícios!")
                else
                    Notify(onlineSrc, "info", "Seu VIP foi removido.")
                end
            end
        end)
    else
        pcall(function()
            local off = exports.qbx_core:GetOfflinePlayer(citizenId)
            if off then
                off.PlayerData.metadata['vip'] = nil
                exports.qbx_core:SaveOffline(off.PlayerData)
            end
        end)
    end

    if mysqlReady then
        pcall(function()
            MySQL.query("DELETE FROM mri_vip_records WHERE citizenid = ?", { citizenId })
        end)
    end

    print(("[VIP Manager] VIP revogado de '%s' (razão: %s)"):format(citizenId, reason or "manual"))
    return true
end

-- ─────────────────────────────────────────────────────────────
--  EXTEND VIP
-- ─────────────────────────────────────────────────────────────

ExtendVip = function(citizenId, extraDays, grantedBy)
    if not citizenId or not extraDays or not mysqlReady then return false end

    local ok, record = pcall(function()
        return MySQL.query.await(
            "SELECT expires_at FROM mri_vip_records WHERE citizenid = ?",
            { citizenId }
        )
    end)
    if not ok or not record or not record[1] then
        return false, "Registro não encontrado"
    end

    local now    = os.time()
    local base   = (record[1].expires_at and record[1].expires_at > now) and record[1].expires_at or now
    local newExp = base + (tonumber(extraDays) * 86400)

    pcall(function()
        MySQL.query(
            "UPDATE mri_vip_records SET expires_at = ?, granted_by = ?, updated_at = ? WHERE citizenid = ?",
            { newExp, grantedBy or 'system', now, citizenId }
        )
    end)

    local src = GetOnlineSource(citizenId)
    if src then Notify(src, "success", ("VIP renovado por mais %d dias!"):format(extraDays)) end
    return true
end

-- ─────────────────────────────────────────────────────────────
--  THREAD — EXPIRY WATCHER (a cada 5 min)
-- ─────────────────────────────────────────────────────────────

CreateThread(function()
    while true do
        Wait(5 * 60 * 1000)
        if not mysqlReady then break end

        local ok, records = pcall(function()
            return MySQL.query.await([[
                SELECT citizenid, tier, expires_at
                FROM mri_vip_records
                WHERE expires_at IS NOT NULL AND expires_at <= ?
            ]], { os.time() })
        end)

        if ok and records and #records > 0 then
            for _, r in ipairs(records) do
                pcall(RevokeVip, r.citizenid, 'expired')
            end
        end
    end
end)

-- ─────────────────────────────────────────────────────────────
--  THREAD — PAYCHECK TRACKER
-- ─────────────────────────────────────────────────────────────

CreateThread(function()
    local uptime        = GetGameTimer()
    local timeSinceLast = uptime % intervalMs
    Wait(intervalMs - timeSinceLast)

    while true do
        if mysqlReady then
            local cfg = GetVipConfigs()
            local ok, players = pcall(function()
                return exports.qbx_core:GetQBPlayers()
            end)
            if ok and players then
                for _, player in pairs(players) do
                    local vip = player.PlayerData.metadata['vip']
                    if vip and vip ~= 'nenhum' then
                        local salary = (cfg[vip] and cfg[vip].payment) or 0
                        if salary > 0 then
                            local cid = player.PlayerData.citizenid
                            pcall(function()
                                    MySQL.query([[
                                        INSERT INTO mri_vip_records
                                            (citizenid, tier, granted_at, expires_at, total_earned, paycheck_count, granted_by, updated_at)
                                        VALUES (?, ?, 0, NULL, ?, 1, 'legacy-paycheck', ?)
                                        ON DUPLICATE KEY UPDATE
                                            total_earned   = total_earned + VALUES(total_earned),
                                            paycheck_count = paycheck_count + 1,
                                            updated_at     = VALUES(updated_at)
                                    ]], { cid, vip, salary, os.time() })
                                end)
                        end
                    end
                end
            end
        end
        Wait(intervalMs)
    end
end)

-- ─────────────────────────────────────────────────────────────
--  EVENT — PlayerLoaded
-- ─────────────────────────────────────────────────────────────

AddEventHandler('QBCore:Server:PlayerLoaded', function(player)
    if not mysqlReady then return end

    local citizenId = player.PlayerData.citizenid
    local metaVip   = player.PlayerData.metadata['vip']

    local ok, record = pcall(function()
        return MySQL.query.await(
            "SELECT * FROM mri_vip_records WHERE citizenid = ?",
            { citizenId }
        )
    end)

    local r = ok and record and record[1]

    if r then
        -- Verifica expiração
        if r.expires_at and os.time() >= r.expires_at then
            pcall(RevokeVip, citizenId, 'expired')
            Notify(player.PlayerData.source, "warning",
                "Seu VIP expirou enquanto você estava offline. Renove para reativar!")
            return
        end
        -- Consistência de metadata
        if not metaVip then
            pcall(function()
                player.Functions.SetMetaData('vip', r.tier)
                lib.addPrincipal(player.PlayerData.source, r.tier)
            end)
        end
    elseif metaVip and metaVip ~= 'nenhum' then
        -- VIP legado sem registro no DB
        pcall(function()
            MySQL.query([[
                INSERT IGNORE INTO mri_vip_records (citizenid, tier, granted_at, expires_at, granted_by)
                VALUES (?, ?, 0, NULL, 'legacy')
            ]], { citizenId, metaVip })
        end)
        print(("[VIP Manager] VIP legado registrado: '%s' tier='%s'"):format(citizenId, metaVip))
    end
end)

-- ─────────────────────────────────────────────────────────────
--  CALLBACKS ADMIN
-- ─────────────────────────────────────────────────────────────

-- Verificação de permissão (chamada pelo cliente ao abrir o menu)
lib.callback.register('mri_esc:vip:admin:checkPerm', function(source)
    if not source or source <= 0 then return false end
    local src = tostring(source)

    -- Tenta todos os nomes comuns de ACE admin no FiveM/QBX
    local aceNames = {
        "group.admin", "group.superadmin", "group.god",
        "group.mod", "vip.admin", "admin"
    }
    for _, ace in ipairs(aceNames) do
        if IsPlayerAceAllowed(src, ace) then
            print(("[VIP Admin] source=%s TEM permissão via ACE '%s'"):format(src, ace))
            return true
        end
    end

    -- Tenta via QBX playerData (grupo/role nativo)
    local ok, result = pcall(function()
        local player = exports.qbx_core:GetPlayer(source)
        if not player then return false end
        local pd = player.PlayerData
        -- Alguns servidores QBX guardam o grupo em diferentes campos
        local group = pd.group or pd.role or pd.job and pd.job.name or ""
        print(("[VIP Admin] source=%s grupo QBX='%s'"):format(src, tostring(group)))
        return group == "admin" or group == "superadmin" or group == "god"
    end)
    if ok and result then
        print(("[VIP Admin] source=%s TEM permissão via QBX playerData"):format(src))
        return true
    end

    -- Fallback: verifica se tem qualquer ACE de command.* (debug)
    local hasAnyCmd = IsPlayerAceAllowed(src, "command")
    print(("[VIP Admin] source=%s NÃO é admin. ACE 'command'=%s"):format(src, tostring(hasAnyCmd)))
    return false
end)

lib.callback.register('mri_esc:vip:admin:list', function(source)
    if not IsPlayerAceAllowed(tostring(source), "group.admin") and not (pcall(lib.hasGroup, source, {'admin','superadmin','god'}) and lib.hasGroup(source, {'admin','superadmin','god'})) then return {} end
    if not mysqlReady then return {} end

    local ok, rows = pcall(function()
        return MySQL.query.await([[
            SELECT citizenid, tier, granted_at, expires_at,
                   total_earned, paycheck_count, granted_by, updated_at
            FROM mri_vip_records
            ORDER BY granted_at DESC
        ]])
    end)
    return (ok and rows) and rows or {}
end)

lib.callback.register('mri_esc:vip:admin:grant', function(source, data)
    if not IsPlayerAceAllowed(tostring(source), "group.admin") then
        return { success = false, error = "Sem permissão" }
    end
    if not data or not data.citizenId or not data.tier then
        return { success = false, error = "Dados inválidos" }
    end

    local adminName = "Admin"
    pcall(function()
        local ap = exports.qbx_core:GetPlayer(source)
        if ap then
            adminName = ap.PlayerData.charinfo.firstname .. " " .. ap.PlayerData.charinfo.lastname
        end
    end)

    local ok, err = GrantVip(data.citizenId, data.tier, data.durationDays, adminName)
    return ok and { success = true } or { success = false, error = err }
end)

lib.callback.register('mri_esc:vip:admin:revoke', function(source, data)
    if not IsPlayerAceAllowed(tostring(source), "group.admin") then
        return { success = false, error = "Sem permissão" }
    end
    if not data or not data.citizenId then
        return { success = false, error = "ciudadanId obrigatório" }
    end
    RevokeVip(data.citizenId, 'admin')
    return { success = true }
end)

lib.callback.register('mri_esc:vip:admin:extend', function(source, data)
    if not IsPlayerAceAllowed(tostring(source), "group.admin") then
        return { success = false, error = "Sem permissão" }
    end
    if not data or not data.citizenId or not data.days then
        return { success = false, error = "Dados inválidos" }
    end
    local adminName = "Admin"
    pcall(function()
        local ap = exports.qbx_core:GetPlayer(source)
        if ap then adminName = ap.PlayerData.charinfo.firstname .. " " .. ap.PlayerData.charinfo.lastname end
    end)
    local ok, err = ExtendVip(data.citizenId, data.days, adminName)
    return ok and { success = true } or { success = false, error = err }
end)

lib.callback.register('mri_esc:vip:admin:search', function(source, data)
    if not IsPlayerAceAllowed(tostring(source), "group.admin") and not (pcall(lib.hasGroup, source, {'admin','superadmin','god'}) and lib.hasGroup(source, {'admin','superadmin','god'})) then return {} end
    if not data or not data.query then return {} end

    local results = {}
    local search  = data.query:lower()

    pcall(function()
        for _, player in pairs(exports.qbx_core:GetQBPlayers()) do
            local pd   = player.PlayerData
            local name = (pd.charinfo.firstname or "") .. " " .. (pd.charinfo.lastname or "")
            if name:lower():find(search, 1, true) or pd.citizenid:lower():find(search, 1, true) then
                results[#results + 1] = {
                    citizenid = pd.citizenid,
                    name      = name,
                    online    = true,
                    vip       = pd.metadata['vip'] or 'nenhum'
                }
            end
        end
    end)

    if #results == 0 and mysqlReady then
        local s = "%" .. data.query .. "%"
        local ok, rows = pcall(function()
            return MySQL.query.await([[
                SELECT p.citizenid,
                       CONCAT(JSON_UNQUOTE(JSON_EXTRACT(p.charinfo,'$.firstname')),' ',
                              JSON_UNQUOTE(JSON_EXTRACT(p.charinfo,'$.lastname'))) AS name,
                       p.metadata
                FROM players p
                WHERE p.citizenid LIKE ? OR
                      JSON_UNQUOTE(JSON_EXTRACT(p.charinfo,'$.firstname')) LIKE ? OR
                      JSON_UNQUOTE(JSON_EXTRACT(p.charinfo,'$.lastname'))  LIKE ?
                LIMIT 10
            ]], { s, s, s })
        end)
        if ok and rows then
            for _, row in ipairs(rows) do
                local meta = {}
                pcall(function() meta = json.decode(row.metadata) or {} end)
                results[#results + 1] = {
                    citizenid = row.citizenid,
                    name      = row.name,
                    online    = false,
                    vip       = meta['vip'] or 'nenhum'
                }
            end
        end
    end

    return results
end)

-- ─────────────────────────────────────────────────────────────
--  EXPORTS
-- ─────────────────────────────────────────────────────────────

exports("VipMgr_Grant",  GrantVip)
exports("VipMgr_Revoke", RevokeVip)
exports("VipMgr_Extend", ExtendVip)

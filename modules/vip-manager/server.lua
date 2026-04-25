-- =============================================================
--  mri_esc — VIP Manager Module (Server)
--  Responsável: criação de tabela, expiry watcher,
--  paycheck tracker e evento de login.
--
--  TODOS os callbacks admin estão em server.lua (script principal).
-- =============================================================

local paycheckInterval = 30
local intervalMs       = paycheckInterval * 60 * 1000
local mysqlReady       = false

-- Cache global dos planos para acesso rápido
VipPlansConfigs = {}

-- ─────────────────────────────────────────────────────────────
--  AGUARDA MYSQL
-- ─────────────────────────────────────────────────────────────

CreateThread(function()
    -- Aguarda o objeto MySQL (injetado via @oxmysql/lib/MySQL.lua no fxmanifest)
    while not MySQL do Wait(500) end
    
    -- Aguarda o banco de dados estar pronto para consultas
    local attempts = 0
    while not MySQL.query and attempts < 20 do
        Wait(500)
        attempts = attempts + 1
    end

    if MySQL and MySQL.query then
        mysqlReady = true
    else
        print("[VIP Manager] ^1ERRO: MySQL não carregou corretamente após a injeção.^7")
        return
    end

    -- Cria tabelas
    pcall(function()
        MySQL.query([[
            CREATE TABLE IF NOT EXISTS `mri_vip_records` (
                `citizenid`      VARCHAR(50)  NOT NULL,
                `tier`           VARCHAR(50)  NOT NULL DEFAULT 'tier1',
                `granted_at`     INT(11)      NOT NULL DEFAULT 0,
                `expires_at`     INT(11)      DEFAULT NULL,
                `total_earned`   BIGINT       DEFAULT 0,
                `paycheck_count` INT          DEFAULT 0,
                `granted_by`     VARCHAR(100) DEFAULT 'system',
                `updated_at`     INT(11)      DEFAULT NULL,
                PRIMARY KEY (`citizenid`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ]])

        MySQL.query([[
            CREATE TABLE IF NOT EXISTS `mri_vip_plans` (
                `id`         VARCHAR(50)  NOT NULL,
                `label`      VARCHAR(100) NOT NULL,
                `payment`    INT          NOT NULL DEFAULT 0,
                `inventory`  INT          NOT NULL DEFAULT 0,
                `benefits`   LONGTEXT     DEFAULT '[]',
                `updated_at` INT(11)      DEFAULT NULL,
                PRIMARY KEY (`id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ]])
    end)

    -- Carrega planos e verifica expirados
    Wait(500)
    LoadVipPlans()
    
    local ok, expired = pcall(function()
        return MySQL.query.await([[
            SELECT citizenid FROM mri_vip_records
            WHERE expires_at IS NOT NULL AND expires_at <= ?
        ]], { os.time() })
    end)
    if ok and expired and #expired > 0 then
        print(("[VIP Manager] %d VIP(s) expirado(s) ao iniciar."):format(#expired))
        for _, r in ipairs(expired) do
            pcall(RevokeVip, r.citizenid, 'expired')
        end
    end
end)

-- ── CARREGAMENTO DE PLANOS ───────────────────────────────────
function LoadVipPlans()
    if not mysqlReady then return end
    local ok, results = pcall(function()
        return MySQL.query.await("SELECT * FROM mri_vip_plans")
    end)
    
    if ok and results and #results > 0 then
        local newPlans = {}
        for _, p in ipairs(results) do
            newPlans[p.id] = {
                label     = p.label,
                payment   = p.payment,
                inventory = p.inventory,
                benefits  = json.decode(p.benefits or "[]")
            }
        end
        VipPlansConfigs = newPlans
        print(("[VIP Manager] %d planos VIP carregados do DB."):format(#results))
    else
        -- Caso a tabela esteja vazia, popula com os defaults mas não salva (admin deve salvar via UI)
        VipPlansConfigs = {
            tier1 = { label = "Tier 1", payment = 5000, inventory = 200, benefits = {"Salário de R$ 5.000", "+100kg no inventário"} }
        }
    end
end

-- ─────────────────────────────────────────────────────────────
--  HELPERS
-- ─────────────────────────────────────────────────────────────

local function GetVipConfigs()
    if VipPlansConfigs and next(VipPlansConfigs) then return VipPlansConfigs end
    -- Fallback final
    return {
        nenhum = { label = "Sem VIP", payment = 0,    inventory = 100 },
        tier1  = { label = "Tier 1",  payment = 5000, inventory = 200 },
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
--  GLOBAIS: GrantVip / RevokeVip / ExtendVip
--  (acessíveis por server.lua via GrantVip / RevokeVip globais)
-- ─────────────────────────────────────────────────────────────

RevokeVip = function(citizenId, reason) end  -- forward declaration

GrantVip = function(citizenId, tier, durationDays, grantedBy)
    if not citizenId or not tier then return false, "Parâmetros inválidos" end
    local now = os.time()
    local exp = nil
    durationDays = tonumber(durationDays)
    if durationDays and durationDays > 0 then
        exp = now + (durationDays * 86400)
    end

    local onlineSrc = GetOnlineSource(citizenId)
    if onlineSrc then
        pcall(function()
            local player = exports.qbx_core:GetPlayer(onlineSrc)
            if player then
                player.Functions.SetMetaData('vip', tier)
                local cfg = GetVipConfigs()
                if cfg[tier] and cfg[tier].inventory then
                    exports.ox_inventory:SetMaxWeight(onlineSrc, cfg[tier].inventory * 1000)
                end
                Notify(onlineSrc, "success", ("Você recebeu o VIP %s!"):format(tier))
            end
        end)
    else
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
                    tier=VALUES(tier), granted_at=VALUES(granted_at),
                    expires_at=VALUES(expires_at), granted_by=VALUES(granted_by),
                    updated_at=VALUES(updated_at)
            ]], { citizenId, tier, now, exp, grantedBy or 'system', now })
        end)
    end

    print(("[VIP Manager] '%s' concedido a '%s'"):format(tier, citizenId))
    return true
end

RevokeVip = function(citizenId, reason)
    if not citizenId then return false end
    local onlineSrc = GetOnlineSource(citizenId)
    if onlineSrc then
        pcall(function()
            local player = exports.qbx_core:GetPlayer(onlineSrc)
            if player then
                player.Functions.SetMetaData('vip', nil)
                exports.ox_inventory:SetMaxWeight(onlineSrc, 100 * 1000)
                if reason == 'expired' then
                    Notify(onlineSrc, "warning", "Seu VIP expirou. Renove para continuar!")
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
    print(("[VIP Manager] Revogado de '%s' (%s)"):format(citizenId, reason or "manual"))
    return true
end

ExtendVip = function(citizenId, tier, extraDays, grantedBy)
    if not citizenId or not extraDays or not mysqlReady then return false end
    local ok, record = pcall(function()
        return MySQL.query.await("SELECT expires_at FROM mri_vip_records WHERE citizenid = ?", { citizenId })
    end)
    if not ok or not record or not record[1] then return false, "Registro não encontrado" end
    local now  = os.time()
    local base = (record[1].expires_at and record[1].expires_at > now) and record[1].expires_at or now
    local newExp = base + (tonumber(extraDays) * 86400)
    pcall(function()
        MySQL.query("UPDATE mri_vip_records SET tier=?, expires_at=?, granted_by=?, updated_at=? WHERE citizenid=?",
            { tier or 'tier1', newExp, grantedBy or 'system', now, citizenId })
    end)

    -- Atualiza metadados se online para refletir mudança de plano imediata
    local src = GetOnlineSource(citizenId)
    if src then 
        local player = exports.qbx_core:GetPlayer(src)
        if player then player.Functions.SetMetaData('vip', tier) end
        Notify(src, "success", ("VIP renovado/alterado para plano %s!"):format(tier)) 
    end
    return true
end

-- ─────────────────────────────────────────────────────────────
--  THREAD — EXPIRY WATCHER (cada 5 min)
-- ─────────────────────────────────────────────────────────────

CreateThread(function()
    while true do
        Wait(5 * 60 * 1000)
        if mysqlReady then
            local now = os.time()
            local count = MySQL.scalar.await([[
                SELECT COUNT(*) FROM mri_vip_records
                WHERE expires_at IS NOT NULL AND expires_at <= ?
            ]], { now })

            if count and count > 0 then
                local ok, records = pcall(function()
                    return MySQL.query.await([[
                        SELECT citizenid FROM mri_vip_records
                        WHERE expires_at IS NOT NULL AND expires_at <= ?
                    ]], { now })
                end)
                if ok and records and #records > 0 then
                    for _, r in ipairs(records) do
                        pcall(RevokeVip, r.citizenid, 'expired')
                    end
                end
            end
        end
    end
end)

-- ─────────────────────────────────────────────────────────────
--  THREAD — PAYCHECK TRACKER
-- ─────────────────────────────────────────────────────────────

CreateThread(function()
    local uptime = GetGameTimer()
    Wait(intervalMs - (uptime % intervalMs))
    while true do
        if mysqlReady then
            local cfg = GetVipConfigs()
            local ok, players = pcall(function() return exports.qbx_core:GetQBPlayers() end)
            if ok and players then
                local onlineByTier = {}
                for _, player in pairs(players) do
                    local vip = player.PlayerData.metadata['vip']
                    if vip and vip ~= 'nenhum' then
                        if not onlineByTier[vip] then onlineByTier[vip] = {} end
                        table.insert(onlineByTier[vip], player.PlayerData.citizenid)
                    end
                end

                local now = os.time()
                for tier, ids in pairs(onlineByTier) do
                    local salary = cfg[tier] and cfg[tier].payment or 0
                    if salary > 0 then
                        pcall(function()
                            MySQL.query([[
                                UPDATE mri_vip_records
                                SET total_earned   = total_earned + ?,
                                    paycheck_count = paycheck_count + 1,
                                    updated_at     = ?
                                WHERE citizenid IN (?)
                            ]], { salary, now, ids })
                        end)
                    end
                end
            end
        end
        Wait(intervalMs)
    end
end)

-- ─────────────────────────────────────────────────────────────
--  EVENTO — PlayerLoaded (migração de VIPs legados)
-- ─────────────────────────────────────────────────────────────

AddEventHandler('QBCore:Server:PlayerLoaded', function(player)
    if not mysqlReady then return end
    local cid    = player.PlayerData.citizenid
    local metaVip = player.PlayerData.metadata['vip']

    local ok, record = pcall(function()
        return MySQL.query.await("SELECT * FROM mri_vip_records WHERE citizenid = ?", { cid })
    end)
    local r = ok and record and record[1]

    if r then
        if r.expires_at and os.time() >= r.expires_at then
            pcall(RevokeVip, cid, 'expired')
            Notify(player.PlayerData.source, "warning", "Seu VIP expirou. Renove para reativar!")
            return
        end
        if not metaVip then
            pcall(function() player.Functions.SetMetaData('vip', r.tier) end)
        end
    elseif metaVip and metaVip ~= 'nenhum' then
        pcall(function()
            MySQL.query([[
                INSERT IGNORE INTO mri_vip_records (citizenid, tier, granted_at, expires_at, granted_by)
                VALUES (?, ?, 0, NULL, 'legacy')
            ]], { cid, metaVip })
        end)
        print(("[VIP Manager] VIP legado migrado: '%s' tier='%s'"):format(cid, metaVip))
    end
end)

-- ─────────────────────────────────────────────────────────────
--  EXPORTS
-- ─────────────────────────────────────────────────────────────

exports("VipMgr_Grant",  GrantVip)
exports("VipMgr_Revoke", RevokeVip)
exports("VipMgr_Extend", ExtendVip)

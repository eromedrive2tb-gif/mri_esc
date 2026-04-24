-- =============================================================
--  mri_esc — Server Principal (QBX)
-- =============================================================

local paycheckInterval = 30
local intervalMs       = paycheckInterval * 60000

-- ─────────────────────────────────────────────────────────────
--  HELPERS
-- ─────────────────────────────────────────────────────────────

local function GetSyncedTimeLeft()
    local uptime        = GetGameTimer()
    local timeSinceLast = uptime % intervalMs
    return math.floor((intervalMs - timeSinceLast) / 1000)
end

local function SafeGetVipRecord(cid)
    if not MySQL or not MySQL.query then return nil end
    local ok, result = pcall(function()
        return MySQL.query.await(
            "SELECT * FROM mri_vip_records WHERE citizenid = ?",
            { cid }
        )
    end)
    if ok and result then return result[1] end
    return nil
end

-- Verificação de admin confirmada via debug: ACE 'admin' e qbx HasPermission
local function IsAdminPlayer(source)
    local srcStr = tostring(source)
    if IsPlayerAceAllowed(srcStr, "admin")
    or IsPlayerAceAllowed(srcStr, "group.admin")
    or IsPlayerAceAllowed(srcStr, "group.superadmin") then
        return true
    end
    local ok, r = pcall(function()
        return exports.qbx_core:HasPermission(source, 'admin')
    end)
    if ok and r then return true end
    -- Fallback: Config.AdminIds
    if Config and Config.AdminIds then
        for i = 0, GetNumPlayerIdentifiers(source) - 1 do
            local pid = GetPlayerIdentifier(source, i)
            for _, adminId in ipairs(Config.AdminIds) do
                if pid == adminId then return true end
            end
        end
    end
    return false
end

-- ─────────────────────────────────────────────────────────────
if GetResourceState('ox_lib') ~= 'started' then
    RegisterNetEvent('mri_esc:server:reqPlayersOnline', function()
        TriggerClientEvent('mri_esc:client:resPlayersOnline', source, #GetPlayers())
    end)
    return
end

-- ─────────────────────────────────────────────────────────────
--  CALLBACKS PRINCIPAIS
-- ─────────────────────────────────────────────────────────────

lib.callback.register('mri_esc:server:getPlayersOnline', function()
    return #GetPlayers()
end)

lib.callback.register('mri_esc:server:getVipData', function(source)
    local player = exports.qbx_core:GetPlayer(source)
    if not player then return nil end

    local vipTier = player.PlayerData.metadata['vip'] or 'nenhum'
    local coins   = player.PlayerData.money.coin or 0
    local cid     = player.PlayerData.citizenid

    local vipConfigs = VipPlansConfigs or {}
    if not next(vipConfigs) then
        vipConfigs = {
            nenhum = {
                label = "Sem VIP", payment = 0, inventory = 100,
                benefits = { "Torne-se VIP para ganhar benefícios exclusivos!" }
            },
            tier1 = {
                label = "Tier 1", payment = 5000, inventory = 200,
                benefits = {
                    "Salário de R$ 5.000 a cada 30 min",
                    "+100kg no inventário",
                    "Prioridade na fila",
                    "Suporte VIP"
                }
            }
        }
    end

    local currentVipInfo = vipConfigs[vipTier] or vipConfigs['nenhum']
    if not currentVipInfo then 
        currentVipInfo = { label = "Inexistente", payment = 0, inventory = 100, benefits = {} }
    end

    local r           = SafeGetVipRecord(cid)
    local vipSince    = r and r.granted_at   or (vipTier ~= 'nenhum' and 0 or nil)
    local vipExpires  = r and r.expires_at   or nil
    local totalEarned = r and r.total_earned or 0
    local paycheckCount = r and r.paycheck_count or 0

    local daysActive = 0
    if vipSince and vipSince > 0 then
        daysActive = math.floor((os.time() - vipSince) / 86400)
    end

    local isExpired, daysLeft = false, nil
    if vipExpires and vipExpires > 0 then
        local diff = vipExpires - os.time()
        isExpired = diff <= 0
        daysLeft  = math.max(0, math.floor(diff / 86400))
    end

    local charName = string.format("%s %s",
        player.PlayerData.charinfo.firstname or "",
        player.PlayerData.charinfo.lastname  or "")

    return {
        tier          = vipTier,
        label         = currentVipInfo.label    or "Nenhum",
        salary        = currentVipInfo.payment  or 0,
        inventory     = currentVipInfo.inventory or 0,
        coins         = coins,
        benefits      = currentVipInfo.benefits,
        interval      = paycheckInterval,
        timeLeft      = GetSyncedTimeLeft(),
        vipSince      = vipSince,
        vipExpires    = vipExpires,
        daysActive    = daysActive,
        daysLeft      = daysLeft,
        isExpired     = isExpired,
        totalEarned   = totalEarned,
        paycheckCount = paycheckCount,
        charName      = charName,
        charJob       = player.PlayerData.job.label or 'Desempregado',
        citizenId     = cid,
        isAdmin       = IsAdminPlayer(source),
        allPlans      = (function()
            local p = {}
            for id, cfg in pairs(vipConfigs) do
                if id ~= 'nenhum' then
                    p[#p+1] = {
                        id = id,
                        label = cfg.label,
                        payment = cfg.payment,
                        inventory = cfg.inventory,
                        benefits = cfg.benefits
                    }
                end
            end
            table.sort(p, function(a,b) return (tonumber(a.payment) or 0) < (tonumber(b.payment) or 0) end)
            return p
        end)()
    }
end)

-- ─────────────────────────────────────────────────────────────
--  ADMIN: LISTAR VIPs
--  Consolida dados do QBX e da tabela mri_vip_records
-- ─────────────────────────────────────────────────────────────

lib.callback.register('mri_esc:vip:admin:list', function(source)
    if not IsAdminPlayer(source) then return { list = {}, stats = { total = 0, online = 0, offline = 0 } } end

    local list = {}
    local onlineCount = 0
    local offlineCount = 0

    -- 1. Buscar registros no mri_vip_records
    local ok, records = pcall(function()
        return MySQL.query.await("SELECT * FROM mri_vip_records")
    end)

    if ok and records then
        for _, r in ipairs(records) do
            local player = exports.qbx_core:GetPlayerByCitizenId(r.citizenid) or exports.qbx_core:GetOfflinePlayer(r.citizenid)
            if player then
                local isOnline = not player.Offline
                if isOnline then onlineCount = onlineCount + 1 else offlineCount = offlineCount + 1 end

                list[#list + 1] = {
                    citizenid      = r.citizenid,
                    name           = player.PlayerData.charinfo.firstname .. " " .. player.PlayerData.charinfo.lastname,
                    tier           = r.tier,
                    online         = isOnline,
                    source         = isOnline and player.PlayerData.source or nil,
                    granted_at     = r.granted_at,
                    expires_at     = r.expires_at,
                    total_earned   = r.total_earned or 0,
                    paycheck_count = r.paycheck_count or 0,
                    granted_by     = r.granted_by,
                }
            end
        end
    end

    -- 2. Tentar adicionar quem é VIP por metadata mas não está no DB (legado/fallback)
    for _, player in pairs(exports.qbx_core:GetQBPlayers()) do
        local vip = player.PlayerData.metadata['vip']
        if vip and vip ~= 'nenhum' then
            local found = false
            for _, item in ipairs(list) do
                if item.citizenid == player.PlayerData.citizenid then
                    found = true
                    break
                end
            end
            if not found then
                onlineCount = onlineCount + 1
                list[#list + 1] = {
                    citizenid = player.PlayerData.citizenid,
                    name = player.PlayerData.charinfo.firstname .. " " .. player.PlayerData.charinfo.lastname,
                    tier = vip,
                    online = true,
                    source = player.PlayerData.source,
                    granted_at = 0,
                    expires_at = nil,
                    total_earned = 0,
                    paycheck_count = 0,
                    granted_by = 'mri_qbox_metadata'
                }
            end
        end
    end

    return {
        list = list,
        stats = {
            total = onlineCount + offlineCount,
            online = onlineCount,
            offline = offlineCount
        }
    }
end)

-- ─────────────────────────────────────────────────────────────
--  ADMIN: CONCEDER VIP
-- ─────────────────────────────────────────────────────────────

lib.callback.register('mri_esc:vip:admin:grant', function(source, data)
    if not IsAdminPlayer(source) then return { success = false, error = "Sem permissão" } end
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

    -- Chama GrantVip do módulo se disponível, senão aplica diretamente
    local ok, err = pcall(function()
        if GrantVip then
            GrantVip(data.citizenId, data.tier, data.durationDays, adminName)
        else
            -- Aplicação direta via QBX
            local online = exports.qbx_core:GetPlayerByCitizenId(data.citizenId)
            if online then
                online.Functions.SetMetaData('vip', data.tier)
            else
                local off = exports.qbx_core:GetOfflinePlayer(data.citizenId)
                if off then
                    off.PlayerData.metadata['vip'] = data.tier
                    exports.qbx_core:SaveOffline(off.PlayerData)
                end
            end
            -- Insere no DB
            if MySQL and MySQL.query then
                local now = os.time()
                local exp = data.durationDays and tonumber(data.durationDays) > 0
                    and (now + tonumber(data.durationDays) * 86400) or nil
                MySQL.query([[
                    INSERT INTO mri_vip_records (citizenid, tier, granted_at, expires_at, granted_by, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        tier=VALUES(tier), granted_at=VALUES(granted_at),
                        expires_at=VALUES(expires_at), granted_by=VALUES(granted_by),
                        updated_at=VALUES(updated_at)
                ]], { data.citizenId, data.tier, now, exp, adminName, now })
            end
        end
    end)

    return ok and { success = true } or { success = false, error = tostring(err) }
end)

-- ─────────────────────────────────────────────────────────────
--  ADMIN: REVOGAR VIP
-- ─────────────────────────────────────────────────────────────

lib.callback.register('mri_esc:vip:admin:revoke', function(source, data)
    if not IsAdminPlayer(source) then return { success = false, error = "Sem permissão" } end
    if not data or not data.citizenId then return { success = false, error = "citizenId obrigatório" } end

    pcall(function()
        if RevokeVip then
            RevokeVip(data.citizenId, 'admin')
        else
            local online = exports.qbx_core:GetPlayerByCitizenId(data.citizenId)
            if online then
                online.Functions.SetMetaData('vip', nil)
            else
                local off = exports.qbx_core:GetOfflinePlayer(data.citizenId)
                if off then
                    off.PlayerData.metadata['vip'] = nil
                    exports.qbx_core:SaveOffline(off.PlayerData)
                end
            end
            if MySQL and MySQL.query then
                MySQL.query("DELETE FROM mri_vip_records WHERE citizenid = ?", { data.citizenId })
            end
        end
    end)

    return { success = true }
end)

-- ─────────────────────────────────────────────────────────────
--  ADMIN: RENOVAR VIP
-- ─────────────────────────────────────────────────────────────

lib.callback.register('mri_esc:vip:admin:extend', function(source, data)
    if not IsAdminPlayer(source) then return { success = false, error = "Sem permissão" } end
    if not data or not data.citizenId or not data.days then return { success = false, error = "Dados inválidos" } end

    local adminName = "Admin"
    pcall(function()
        local ap = exports.qbx_core:GetPlayer(source)
        if ap then adminName = ap.PlayerData.charinfo.firstname .. " " .. ap.PlayerData.charinfo.lastname end
    end)

    local ok = false
    if ExtendVip then
        local extOk = pcall(ExtendVip, data.citizenId, data.days, adminName)
        ok = extOk
    elseif MySQL and MySQL.query then
        ok = true
        pcall(function()
            local now  = os.time()
            local recs = MySQL.query.await("SELECT expires_at FROM mri_vip_records WHERE citizenid = ?", { data.citizenId })
            local base = (recs and recs[1] and recs[1].expires_at and recs[1].expires_at > now)
                and recs[1].expires_at or now
            local newExp = base + (tonumber(data.days) * 86400)
            MySQL.query(
                "INSERT INTO mri_vip_records (citizenid, tier, granted_at, expires_at, granted_by, updated_at) VALUES (?, 'tier1', 0, ?, ?, ?) ON DUPLICATE KEY UPDATE expires_at=VALUES(expires_at), granted_by=VALUES(granted_by), updated_at=VALUES(updated_at)",
                { data.citizenId, newExp, adminName, now }
            )
        end)
    end

    return ok and { success = true } or { success = false, error = "Falha ao renovar" }
end)

-- ─────────────────────────────────────────────────────────────
--  ADMIN: BUSCA DE JOGADORES
-- ─────────────────────────────────────────────────────────────

lib.callback.register('mri_esc:vip:admin:search', function(source, data)
    if not IsAdminPlayer(source) then return {} end
    if not data or not data.query or #data.query < 2 then return {} end

    local results = {}
    local search  = data.query:lower()

    -- Online primeiro
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

    -- DB offline
    if MySQL and MySQL.query then
        local s = "%" .. data.query .. "%"
        local ok, rows = pcall(function()
            return MySQL.query.await([[
                SELECT p.citizenid,
                    CONCAT(JSON_UNQUOTE(JSON_EXTRACT(p.charinfo,'$.firstname')),' ',
                           JSON_UNQUOTE(JSON_EXTRACT(p.charinfo,'$.lastname'))) AS name,
                    JSON_UNQUOTE(JSON_EXTRACT(p.metadata,'$.vip')) AS vip
                FROM players p
                WHERE p.citizenid LIKE ?
                   OR JSON_UNQUOTE(JSON_EXTRACT(p.charinfo,'$.firstname')) LIKE ?
                   OR JSON_UNQUOTE(JSON_EXTRACT(p.charinfo,'$.lastname'))  LIKE ?
                LIMIT 10
            ]], { s, s, s })
        end)
        if ok and rows then
            for _, row in ipairs(rows) do
                -- Não duplicar online
                local found = false
                for _, r in ipairs(results) do
                    if r.citizenid == row.citizenid then found = true; break end
                end
                if not found then
                    results[#results + 1] = {
                        citizenid = row.citizenid,
                        name      = row.name,
                        online    = false,
                        vip       = row.vip or 'nenhum'
                    }
                end
            end
        end
    end

    return results
end)

-- ── ADMIN: CARREGAR PLANOS ────────────────────────────────────
lib.callback.register('mri_esc:admin:getPlans', function(source)
    if not IsAdminPlayer(source) then return {} end
    local plans = {}
    -- VipPlansConfigs está definido em modules/vip-manager/server.lua
    for id, cfg in pairs(VipPlansConfigs or {}) do
        plans[#plans + 1] = {
            id = id,
            label = cfg.label,
            payment = cfg.payment,
            inventory = cfg.inventory,
            benefits = cfg.benefits
        }
    end
    return plans
end)

-- ── ADMIN: SALVAR PLANO ───────────────────────────────────────
lib.callback.register('mri_esc:admin:savePlan', function(source, data)
    if not IsAdminPlayer(source) then return { success = false, error = "Sem permissão" } end
    if not data.id or not data.label then return { success = false, error = "Dados inválidos" } end
    
    local ok, err = pcall(function()
        MySQL.query([[
            INSERT INTO mri_vip_plans (id, label, payment, inventory, benefits, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                label=VALUES(label), payment=VALUES(payment), 
                inventory=VALUES(inventory), benefits=VALUES(benefits), 
                updated_at=VALUES(updated_at)
        ]], { 
            data.id, data.label, tonumber(data.payment) or 0, 
            tonumber(data.inventory) or 0, json.encode(data.benefits or {}), os.time() 
        })
        -- Recarrega cache local (função global em modules/vip-manager/server.lua)
        if LoadVipPlans then LoadVipPlans() end
    end)
    return { success = ok, error = not ok and tostring(err) or nil }
end)

-- ── ADMIN: DELETAR PLANO ──────────────────────────────────────
lib.callback.register('mri_esc:admin:deletePlan', function(source, id)
    if not IsAdminPlayer(source) then return { success = false, error = "Sem permissão" } end
    local ok, err = pcall(function()
        MySQL.query("DELETE FROM mri_vip_plans WHERE id = ?", { id })
        if LoadVipPlans then LoadVipPlans() end
    end)
    return { success = ok, error = not ok and tostring(err) or nil }
end)

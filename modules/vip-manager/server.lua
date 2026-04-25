-- =============================================================
--  mri_esc — VIP Manager Module (Server)
--  Handles VIP Granting, Revocation, and Expiry
-- =============================================================

VipPlansConfigs = {} -- Global para ser lido pelo server.lua
local mysqlReady = false

-- ── INICIALIZAÇÃO ───────────────────────────────────────────
CreateThread(function()
    Wait(1000)
    mysqlReady = (GetResourceState('oxmysql') == 'started')
    
    if mysqlReady then
        MySQL.query([[
            CREATE TABLE IF NOT EXISTS `mri_vip_records` (
                `citizenid`      VARCHAR(50)  NOT NULL,
                `tier`           VARCHAR(50)  NOT NULL,
                `granted_at`     INT(11)      NOT NULL,
                `expires_at`     INT(11)      DEFAULT NULL,
                `granted_by`     VARCHAR(100) DEFAULT 'system',
                `total_earned`   INT(11)      DEFAULT 0,
                `paycheck_count` INT(11)      DEFAULT 0,
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
    end

    -- Carrega planos e verifica expirados
    Wait(500)
    LoadVipPlans()
    
    if mysqlReady then
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
        VipPlansConfigs = {}
    end
end

-- ── HELPERS ─────────────────────────────────────────────────
function GetVipConfigs()
    if VipPlansConfigs and next(VipPlansConfigs) then return VipPlansConfigs end
    return {
        nenhum = { label = "Sem VIP", payment = 0,    inventory = 100 },
        tier1  = { label = "Tier 1",  payment = 5000, inventory = 200 },
    }
end

local function GetOnlineSource(citizenId)
    if not citizenId then return nil end
    local cid = citizenId:upper()
    local ok, player = pcall(function()
        return exports.qbx_core:GetPlayerByCitizenId(cid)
    end)
    if player and player.PlayerData then
        return player.PlayerData.source
    end
    return nil
end

function Notify(src, ntype, msg)
    if not src or src <= 0 then return end
    pcall(function()
        lib.notify(src, { title = "VIP", type = ntype, description = msg })
    end)
end

-- ── GLOBAIS: GrantVip / RevokeVip / ExtendVip ───────────────
RevokeVip = function(citizenId, reason)
    if not citizenId then return false end
    local cid = citizenId:upper()
    local onlineSrc = GetOnlineSource(cid)
    
    if onlineSrc then
        local player = exports.qbx_core:GetPlayer(onlineSrc)
        if player then
            local oldVip = player.PlayerData.metadata['vip']
            if oldVip and oldVip ~= 'nenhum' then
                pcall(function() lib.removePrincipal(onlineSrc, oldVip) end)
            end
            player.Functions.SetMetaData('vip', nil)
            exports.ox_inventory:SetMaxWeight(onlineSrc, 100 * 1000)
            Notify(onlineSrc, (reason == 'expired' and "warning" or "info"), 
                (reason == 'expired' and "Seu VIP expirou!" or "Seu VIP foi removido."))
        end
    else
        local off = exports.qbx_core:GetOfflinePlayer(cid)
        if off then
            off.PlayerData.metadata['vip'] = nil
            exports.qbx_core:SaveOffline(off.PlayerData)
        end
    end
    
    if mysqlReady then
        MySQL.query("DELETE FROM mri_vip_records WHERE citizenid = ?", { cid })
    end
    
    print(("[VIP Manager] Revogado de '%s' (%s)"):format(cid, reason or "manual"))
    return true
end

GrantVip = function(citizenId, tier, durationDays, grantedBy)
    if not citizenId or not tier then return false, "Parâmetros inválidos" end
    local cid = citizenId:upper()
    local now = os.time()
    local exp = nil
    durationDays = tonumber(durationDays)
    if durationDays and durationDays > 0 then
        exp = now + (durationDays * 86400)
    end

    local onlineSrc = GetOnlineSource(cid)
    if onlineSrc then
        local player = exports.qbx_core:GetPlayer(onlineSrc)
        if player then
            local oldVip = player.PlayerData.metadata['vip']
            if oldVip and oldVip ~= 'nenhum' then
                pcall(function() lib.removePrincipal(onlineSrc, oldVip) end)
            end
            lib.addPrincipal(onlineSrc, tier)
            player.Functions.SetMetaData('vip', tier)
            
            local cfg = GetVipConfigs()
            if cfg[tier] and cfg[tier].inventory then
                exports.ox_inventory:SetMaxWeight(onlineSrc, cfg[tier].inventory * 1000)
            end
            Notify(onlineSrc, "success", ("Você recebeu o VIP %s!"):format(tier))
        end
    else
        local off = exports.qbx_core:GetOfflinePlayer(cid)
        if off then
            off.PlayerData.metadata['vip'] = tier
            exports.qbx_core:SaveOffline(off.PlayerData)
        end
    end

    if mysqlReady then
        MySQL.query([[
            INSERT INTO mri_vip_records (citizenid, tier, granted_at, expires_at, granted_by, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                tier=VALUES(tier), granted_at=VALUES(granted_at),
                expires_at=VALUES(expires_at), granted_by=VALUES(granted_by),
                updated_at=VALUES(updated_at)
        ]], { cid, tier, now, exp, grantedBy or 'system', now })
    end

    print(("[VIP Manager] '%s' concedido a '%s'"):format(tier, cid))
    return true
end

ExtendVip = function(citizenId, tier, extraDays, grantedBy)
    if not citizenId or not extraDays or not mysqlReady then return false end
    local cid = citizenId:upper()
    local record = MySQL.query.await("SELECT expires_at FROM mri_vip_records WHERE citizenid = ?", { cid })
    
    if not record or not record[1] then return false, "Registro não encontrado" end
    
    local now  = os.time()
    local base = (record[1].expires_at and record[1].expires_at > now) and record[1].expires_at or now
    local newExp = base + (tonumber(extraDays) * 86400)
    
    MySQL.query("UPDATE mri_vip_records SET tier=?, expires_at=?, granted_by=?, updated_at=? WHERE citizenid=?",
        { tier or 'tier1', newExp, grantedBy or 'system', now, cid })

    local src = GetOnlineSource(cid)
    if src then 
        local player = exports.qbx_core:GetPlayer(src)
        if player then 
            local oldVip = player.PlayerData.metadata['vip']
            if oldVip and oldVip ~= 'nenhum' then pcall(function() lib.removePrincipal(src, oldVip) end) end
            lib.addPrincipal(src, tier)
            player.Functions.SetMetaData('vip', tier) 
            local cfg = GetVipConfigs()
            if cfg[tier] and cfg[tier].inventory then
                exports.ox_inventory:SetMaxWeight(src, cfg[tier].inventory * 1000)
            end
            Notify(src, "success", ("VIP renovado para plano %s!"):format(tier)) 
        end
    end
    return true
end

-- ── THREAD — PAYCHECK TRACKER ───────────────────────────────
CreateThread(function()
    Wait(5000) -- Apenas um pequeno delay para garantir que o MySQL e Planos carregaram
    while true do
        -- 1. SINCRONIZAÇÃO: Espera o ciclo atual terminar antes de pagar
        local waitMin = tonumber(paycheckInterval) or 30
        local interval = waitMin * 60000
        local uptime = GetGameTimer()
        local timeUntilNext = interval - (uptime % interval)
        
        if timeUntilNext < 500 then timeUntilNext = interval end
        Wait(timeUntilNext)

        -- 2. PAGAMENTO (Ocorre após o Wait)
        if mysqlReady then
            local cfg = GetVipConfigs()
            local players = exports.qbx_core:GetQBPlayers()
            if players then
                local now = os.time()
                for _, player in pairs(players) do
                    local vip = player.PlayerData.metadata['vip']
                    if vip and vip ~= 'nenhum' then
                        local salary = cfg[vip] and cfg[vip].payment or 0
                        if salary > 0 then
                            -- Entrega dinheiro real
                            player.Functions.AddMoney('bank', salary, "VIP Paycheck")
                            Notify(player.PlayerData.source, "success", ("Salário VIP de R$ %s depositado!"):format(salary))

                            -- Atualiza métrica SQL
                            MySQL.query([[
                                UPDATE mri_vip_records
                                SET total_earned = total_earned + ?,
                                    paycheck_count = paycheck_count + 1,
                                    updated_at = ?
                                WHERE citizenid = ?
                            ]], { salary, now, player.PlayerData.citizenid })
                        end
                    end
                end
            end
        end
    end
end)

-- ── EVENTO — PlayerLoaded ───────────────────────────────────
AddEventHandler('QBCore:Server:PlayerLoaded', function(player)
    if not mysqlReady then return end
    local cid = player.PlayerData.citizenid
    local record = MySQL.query.await("SELECT * FROM mri_vip_records WHERE citizenid = ?", { cid })
    local r = record and record[1]

    if r then
        if r.expires_at and os.time() >= r.expires_at then
            RevokeVip(cid, 'expired')
        else
            player.Functions.SetMetaData('vip', r.tier) 
            lib.addPrincipal(player.PlayerData.source, r.tier)
            local cfg = GetVipConfigs()
            if cfg[r.tier] and cfg[r.tier].inventory then
                exports.ox_inventory:SetMaxWeight(player.PlayerData.source, cfg[r.tier].inventory * 1000)
            end
        end
    end
end)

-- ── EXPORTS ─────────────────────────────────────────────────
exports("VipMgr_Grant",  GrantVip)
exports("VipMgr_Revoke", RevokeVip)
exports("VipMgr_Extend", ExtendVip)

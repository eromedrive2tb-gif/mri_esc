-- =============================================================
--  mri_esc — VIP Manager Module (Controller Molecule)
-- =============================================================

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

local function Notify(src, ntype, msg)
    if not src or src <= 0 then return end
    pcall(function()
        lib.notify(src, { title = "VIP", type = ntype, description = msg })
    end)
end

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
            player.Functions.SetMetaData('vip', 'nenhum')
            exports.ox_inventory:SetMaxWeight(onlineSrc, 100 * 1000)
            Notify(onlineSrc, (reason == 'expired' and "warning" or "info"), 
                (reason == 'expired' and "Seu VIP expirou!" or "Seu VIP foi removido."))
            TriggerClientEvent('mri_esc:client:refreshVip', onlineSrc)
        end
    else
        local off = exports.qbx_core:GetOfflinePlayer(cid)
        if off then
            off.PlayerData.metadata['vip'] = 'nenhum'
            exports.qbx_core:SaveOffline(off.PlayerData)
        end
    end
    
    if GetResourceState('oxmysql') == 'started' then
        MySQL.query.await("DELETE FROM mri_vip_records WHERE citizenid = ?", { cid })
    end
    
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
            TriggerClientEvent('mri_esc:client:refreshVip', onlineSrc)
        end
    else
        local off = exports.qbx_core:GetOfflinePlayer(cid)
        if off then
            off.PlayerData.metadata['vip'] = tier
            exports.qbx_core:SaveOffline(off.PlayerData)
        end
    end

    if GetResourceState('oxmysql') == 'started' then
        MySQL.query.await([[
            INSERT INTO mri_vip_records (citizenid, tier, granted_at, expires_at, granted_by, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                tier=VALUES(tier), granted_at=VALUES(granted_at),
                expires_at=VALUES(expires_at), granted_by=VALUES(granted_by),
                updated_at=VALUES(updated_at)
        ]], { cid, tier, now, exp, grantedBy or 'system', now })
    end

    return true
end

ExtendVip = function(citizenId, tier, extraDays, grantedBy)
    if not citizenId or not extraDays then return false end
    local cid = citizenId:upper()
    local record = MySQL.query.await("SELECT expires_at FROM mri_vip_records WHERE citizenid = ?", { cid })
    
    if not record or not record[1] then return false, "Registro não encontrado" end
    
    local now  = os.time()
    local base = (record[1].expires_at and record[1].expires_at > now) and record[1].expires_at or now
    local newExp = base + (tonumber(extraDays) * 86400)
    
    MySQL.query.await("UPDATE mri_vip_records SET tier=?, expires_at=?, granted_by=?, updated_at=? WHERE citizenid=?",
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
            TriggerClientEvent('mri_esc:client:refreshVip', src)
        end
    end
    return true
end

-- ── THREAD — PAYCHECK TRACKER ───────────────────────────────
CreateThread(function()
    Wait(5000)
    print("[VIP Paycheck] Thread started")
    while true do
        local waitMin = tonumber(paycheckInterval) or 30
        local interval = waitMin * 60000
        local uptime = GetGameTimer()
        local timeUntilNext = interval - (uptime % interval)
        
        if timeUntilNext < 500 then timeUntilNext = interval end
        Wait(timeUntilNext)

        local ok, err = pcall(function()
            local cfg = GetVipConfigs()
            local players = exports.qbx_core:GetQBPlayers()
            if not players then return end

            local now = os.time()
            for _, player in pairs(players) do
                local vip = player.PlayerData.metadata['vip']
                if vip and vip ~= 'nenhum' then
                    local plan = cfg[vip]
                    local salary = tonumber(plan and plan.payment) or 0
                    local src = player.PlayerData.source

                    -- 1. Grant Money
                    if salary > 0 then
                        player.Functions.AddMoney('bank', salary, "VIP Paycheck")
                        Notify(src, "success", ("Salário VIP de R$ %s depositado!"):format(salary))
                        print(("[VIP Paycheck] Paid $%d to %s (tier: %s)"):format(salary, player.PlayerData.citizenid, vip))
                    end

                    -- 2. Grant Item Rewards
                    if plan and plan.rewards and #plan.rewards > 0 then
                        for _, reward in ipairs(plan.rewards) do
                            local qty = tonumber(reward.amount) or 0
                            if reward.item and qty > 0 then
                                local itemOk, itemErr = pcall(function()
                                    exports.ox_inventory:AddItem(src, reward.item, qty)
                                end)
                                if itemOk then
                                    print(("[VIP Paycheck] Gave %dx %s to %s"):format(qty, reward.item, player.PlayerData.citizenid))
                                else
                                    print(("[VIP Paycheck] ERROR giving item %s: %s"):format(reward.item, tostring(itemErr)))
                                end
                            end
                        end
                    end

                    -- 3. Update SQL metrics
                    if salary > 0 or (plan and plan.rewards and #plan.rewards > 0) then
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
        end)

        if not ok then
            print("[VIP Paycheck] ERROR in paycheck loop: " .. tostring(err))
        end
    end
end)

-- ── EVENT — PLAYER LOGIN SYNC ──────────────────────────────
AddEventHandler('QBCore:Server:PlayerLoaded', function(player)
    if GetResourceState('oxmysql') ~= 'started' then return end
    local cid = player.PlayerData.citizenid
    local src = player.PlayerData.source
    
    local record = MySQL.query.await("SELECT * FROM mri_vip_records WHERE citizenid = ?", { cid })
    local r = record and record[1]

    if r then
        -- Check expiry
        if r.expires_at and os.time() >= r.expires_at then
            RevokeVip(cid, 'expired')
        else
            -- Sync status and permissions
            player.Functions.SetMetaData('vip', r.tier) 
            lib.addPrincipal(src, r.tier)
            
            -- Sync Inventory Weight
            local cfg = GetVipConfigs()
            if cfg[r.tier] and cfg[r.tier].inventory then
                exports.ox_inventory:SetMaxWeight(src, cfg[r.tier].inventory * 1000)
            end
            
            TriggerClientEvent('mri_esc:client:refreshVip', src)
        end
    else
        -- No record, ensure no VIP status
        player.Functions.SetMetaData('vip', 'nenhum')
        exports.ox_inventory:SetMaxWeight(src, 100 * 1000)
    end
end)

-- Exports
exports("VipMgr_Grant",  GrantVip)
exports("VipMgr_Revoke", RevokeVip)
exports("VipMgr_Extend", ExtendVip)

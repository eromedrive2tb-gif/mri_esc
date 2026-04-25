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

-- Exports
exports("VipMgr_Grant",  GrantVip)
exports("VipMgr_Revoke", RevokeVip)
exports("VipMgr_Extend", ExtendVip)

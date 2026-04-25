-- =============================================================
--  mri_esc — VIP Manager Module (Callbacks Organism)
-- =============================================================

lib.callback.register('mri_esc:server:getVipData', function(source)
    local player = exports.qbx_core:GetPlayer(source)
    if not player then return nil end

    local vipTier = player.PlayerData.metadata['vip'] or 'nenhum'
    local coins   = player.PlayerData.money.coin or 0
    local cid     = player.PlayerData.citizenid

    local vipConfigs = GetVipConfigs()
    local currentVipInfo = vipConfigs[vipTier] or vipConfigs['nenhum'] or { label = "Nenhum", payment = 0, inventory = 100 }
    
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
        benefits      = currentVipInfo.benefits or {},
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
        isAdmin       = IsAdminPlayer(source) == true, -- Explicit boolean
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

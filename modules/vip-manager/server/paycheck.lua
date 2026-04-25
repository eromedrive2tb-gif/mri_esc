-- =============================================================
--  mri_esc — VIP Manager Module (Paycheck Organism)
-- =============================================================

CreateThread(function()
    Wait(5000)
    while true do
        local waitMin = tonumber(paycheckInterval) or 30
        local interval = waitMin * 60000
        local uptime = GetGameTimer()
        local timeUntilNext = interval - (uptime % interval)
        
        if timeUntilNext < 500 then timeUntilNext = interval end
        Wait(timeUntilNext)

        if GetResourceState('oxmysql') == 'started' then
            local cfg = GetVipConfigs()
            local players = exports.qbx_core:GetQBPlayers()
            if players then
                local now = os.time()
                for _, player in pairs(players) do
                    local vip = player.PlayerData.metadata['vip']
                    if vip and vip ~= 'nenhum' then
                        local salary = cfg[vip] and cfg[vip].payment or 0
                        if salary > 0 then
                            player.Functions.AddMoney('bank', salary, "VIP Paycheck")
                            pcall(function()
                                lib.notify(player.PlayerData.source, { title = "VIP", type = "success", description = ("Salário VIP de R$ %s depositado!"):format(salary) })
                            end)

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

-- PlayerLoaded check
AddEventHandler('QBCore:Server:PlayerLoaded', function(player)
    if GetResourceState('oxmysql') ~= 'started' then return end
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

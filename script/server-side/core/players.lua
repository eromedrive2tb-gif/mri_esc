-- =============================================================
--  mri_esc — Player Tracking Logic
-- =============================================================

local playersCache = { count = 0, timestamp = 0 }

--- Gets the count of online players, with a 5-second cache
--- @return number
lib.callback.register('mri_esc:server:getPlayersOnline', function()
    local now = os.time()
    if now - playersCache.timestamp > 5 then
        playersCache.count = #GetPlayers()
        playersCache.timestamp = now
    end
    return playersCache.count
end)

-- Legacy Support (if ox_lib not started)
if GetResourceState('ox_lib') ~= 'started' then
    RegisterNetEvent('mri_esc:server:reqPlayersOnline', function()
        TriggerClientEvent('mri_esc:client:resPlayersOnline', source, #GetPlayers())
    end)
end

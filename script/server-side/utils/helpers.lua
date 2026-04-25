-- =============================================================
--  mri_esc — General Helpers
-- =============================================================

--- Calculates the time left until the next paycheck synchronization
--- @return number
function GetSyncedTimeLeft()
    local interval = (tonumber(paycheckInterval) or 30) * 60000
    local uptime        = GetGameTimer()
    local timeSinceLast = uptime % interval
    return math.floor((interval - timeSinceLast) / 1000)
end

-- =============================================================
--  mri_esc — Permissions Logic
-- =============================================================

--- Verifies if a player has admin permissions via ACE, QBX, or Config
--- @param source number
--- @return boolean
function IsAdminPlayer(source)
    local srcStr = tostring(source)
    
    -- 1. Check ACE Permissions
    if IsPlayerAceAllowed(srcStr, "admin")
    or IsPlayerAceAllowed(srcStr, "group.admin")
    or IsPlayerAceAllowed(srcStr, "group.superadmin") then
        return true
    end

    -- 2. Check QBX Permissions
    local ok, r = pcall(function()
        return exports.qbx_core:HasPermission(source, 'admin')
    end)
    if ok and r then return true end

    -- 3. Fallback: Config.AdminIds
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

-- =============================================================
--  mri_esc — Main Server Entry Point
-- =============================================================

-- Global paycheck interval accessed by modules
paycheckInterval = 1 

-- Resource startup sequence
CreateThread(function()
    print("^4[mri_esc]^7 Initializing atomic structure...")
    
    -- Verification of critical dependencies
    if GetResourceState('ox_lib') ~= 'started' then
        print("^1[mri_esc] ERROR: ox_lib is required for this resource to function correctly!^7")
    end
    
    if GetResourceState('qbx_core') ~= 'started' then
        print("^1[mri_esc] ERROR: qbx_core is required!^7")
    end

    print("^2[mri_esc] Server-side refactor complete.^7")
end)

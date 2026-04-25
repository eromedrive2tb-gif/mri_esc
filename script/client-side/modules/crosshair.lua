-- =============================================================
--  mri_esc — Crosshair Module
-- =============================================================

miraConfig = { ativo = false }

-- Load mira config from KVP
CreateThread(function()
    local savedMira = GetResourceKvpString("mri_esc:mira")
    if savedMira then
        local ok, decoded = pcall(json.decode, savedMira)
        if ok and decoded then miraConfig = decoded end
    end
end)

-- Main render loop/thread for crosshair
CreateThread(function()
    while true do
        Wait(0)
        if miraConfig and miraConfig.ativo then
            HideHudComponentThisFrame(14) -- Hide native crosshair
        end
    end
end)

-- Exports for external interaction
exports('GetMiraConfig', function()
    return miraConfig
end)

exports('SetMiraConfig', function(config)
    miraConfig = config
    SetResourceKvp("mri_esc:mira", json.encode(config))
    SendNUIMessage({ action = "miraData", mira = config })
end)

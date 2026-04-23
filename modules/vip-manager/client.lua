-- =============================================================
--  mri_esc — VIP Manager Module (Client)
--  Callbacks NUI do painel admin + verificação de permissão
-- =============================================================

local isAdmin = false

-- ─────────────────────────────────────────────────────────────
--  Verifica permissão real via servidor (IsPlayerAceAllowed
--  não funciona no client-side do FiveM)
-- ─────────────────────────────────────────────────────────────

CreateThread(function()
    Wait(2000) -- aguarda player carregar completamente
    local ok, result = pcall(function()
        return lib.callback.await('mri_esc:vip:admin:checkPerm', false)
    end)
    if ok and result then
        isAdmin = true
    end
end)

AddEventHandler('mri_esc:client:setAdmin', function(val)
    isAdmin = val == true
end)

-- ─────────────────────────────────────────────────────────────
--  Exporta flag de admin para client.lua principal
-- ─────────────────────────────────────────────────────────────

exports('IsVipAdmin', function()
    return isAdmin
end)

-- ─────────────────────────────────────────────────────────────
--  NUI Callbacks — painel admin
-- ─────────────────────────────────────────────────────────────

RegisterNUICallback("vip:admin:list", function(_, cb)
    if not isAdmin then cb({ success = false, data = {} }); return end

    local ok, result = pcall(function()
        return lib.callback.await('mri_esc:vip:admin:list', false)
    end)
    cb({ success = true, data = (ok and result) or {} })
end)

RegisterNUICallback("vip:admin:grant", function(data, cb)
    if not isAdmin then cb({ success = false, error = "Sem permissão" }); return end

    local ok, result = pcall(function()
        return lib.callback.await('mri_esc:vip:admin:grant', false, {
            citizenId    = data.citizenId,
            tier         = data.tier,
            durationDays = data.durationDays
        })
    end)
    cb((ok and result) or { success = false, error = "Erro interno" })
end)

RegisterNUICallback("vip:admin:revoke", function(data, cb)
    if not isAdmin then cb({ success = false, error = "Sem permissão" }); return end

    local ok, result = pcall(function()
        return lib.callback.await('mri_esc:vip:admin:revoke', false, {
            citizenId = data.citizenId
        })
    end)
    cb((ok and result) or { success = false, error = "Erro interno" })
end)

RegisterNUICallback("vip:admin:extend", function(data, cb)
    if not isAdmin then cb({ success = false, error = "Sem permissão" }); return end

    local ok, result = pcall(function()
        return lib.callback.await('mri_esc:vip:admin:extend', false, {
            citizenId = data.citizenId,
            days      = data.days
        })
    end)
    cb((ok and result) or { success = false, error = "Erro interno" })
end)

RegisterNUICallback("vip:admin:search", function(data, cb)
    if not isAdmin then cb({}); return end

    local ok, result = pcall(function()
        return lib.callback.await('mri_esc:vip:admin:search', false, {
            query = data.query or ""
        })
    end)
    cb((ok and result) or {})
end)

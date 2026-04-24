-- =============================================================
--  mri_esc — VIP Manager Module (Client)
--  Replica exatamente as funções do mri_Qbox/vip.lua
--  usando os callbacks e eventos já existentes e funcionais
-- =============================================================

-- ── Buscar lista VIP (replica getMenuEntries do mri_Qbox) ─────
-- Usa mri_Qbox:server:getVip que JÁ FUNCIONA e retorna:
-- { vip = [{citizenId, name, role, source, offline, displayName}], onlineVip, offlineVip }
-- ── Buscar lista VIP consolidada (Qbox Metadata + MRI Records) ─────
local function PushAdminList()
    CreateThread(function()
        -- Pequeno delay para garantir que a UI Alpine carregou o componente adminVipPanel
        Wait(500)

        local ok, result = pcall(function()
            return lib.callback.await('mri_esc:vip:admin:list', false)
        end)

        if not ok or not result or not result.list then
            SendNUIMessage({ action = 'updateAdminList', list = {}, stats = { total = 0, online = 0, offline = 0 } })
            return
        end

        -- Envia a lista e as estatísticas consolidadas para a NUI
        SendNUIMessage({
            action = 'updateAdminList',
            list   = result.list,
            stats  = result.stats,
        })
    end)
end

-- ── ATUALIZAR (botão Refresh) ─────────────────────────────────
RegisterNUICallback("vipAdminRefresh", function(_, cb)
    cb({})          -- desbloqueia o NUI imediatamente
    PushAdminList() -- busca e empurra dados em background
end)

-- ── CONCEDER VIP ─────────────────────────────────────────────
RegisterNUICallback("vipAdminGrant", function(data, cb)
    cb({})
    CreateThread(function()
        local ok, result = pcall(function()
            return lib.callback.await('mri_esc:vip:admin:grant', false, {
                citizenId = data.citizenId,
                tier = data.tier,
                durationDays = data.durationDays or 30
            })
        end)

        local res = (ok and result) or { success = false, error = "Erro ao processar no servidor" }
        SendNUIMessage({ action = 'adminActionResult', operation = 'grant', result = res })
        if res.success then
            Wait(500)
            PushAdminList()
        end
    end)
end)

-- ── REVOGAR VIP ──────────────────────────────────────────────
RegisterNUICallback("vipAdminRevoke", function(data, cb)
    cb({})
    CreateThread(function()
        local ok, result = pcall(function()
            return lib.callback.await('mri_esc:vip:admin:revoke', false, {
                citizenId = data.citizenId
            })
        end)

        local res = (ok and result) or { success = false, error = "Erro ao processar no servidor" }
        SendNUIMessage({ action = 'adminActionResult', operation = 'revoke', result = res })
        if res.success then
            Wait(500)
            PushAdminList()
        end
    end)
end)

-- ── RENOVAR VIP (estender prazo via mri_esc DB) ──────────────
-- mri_Qbox não tem extensão de prazo, então mantemos o callback próprio
RegisterNUICallback("vipAdminExtend", function(data, cb)
    cb({})
    CreateThread(function()
        local ok, result = pcall(function()
            return lib.callback.await('mri_esc:vip:admin:extend', false, {
                citizenId = data.citizenId,
                days      = data.days
            })
        end)
        local res = (ok and result) or { success = false, error = "Erro interno" }
        SendNUIMessage({ action = 'adminActionResult', operation = 'extend', result = res })
        if res.success then
            Wait(300)
            PushAdminList()
        end
    end)
end)

-- ── BUSCA DE JOGADORES ────────────────────────────────────────
-- Replica findPlayers do mri_Qbox + pesquisa no DB offline
RegisterNUICallback("vipAdminSearch", function(data, cb)
    CreateThread(function()
        if not data.query or #data.query < 2 then cb({}); return end

        local ok, result = pcall(function()
            return lib.callback.await('mri_esc:vip:admin:search', false, {
                query = data.query
            })
        end)
        cb((ok and result) or {})
    end)
end)

-- ── CARREGAR PLANOS ───────────────────────────────────────────
RegisterNUICallback("vipAdminGetPlans", function(_, cb)
    local plans = lib.callback.await('mri_esc:admin:getPlans', false)
    cb(plans or {})
end)

-- ── SALVAR PLANO ──────────────────────────────────────────────
RegisterNUICallback("vipAdminSavePlan", function(data, cb)
    local res = lib.callback.await('mri_esc:admin:savePlan', false, data)
    cb(res)
end)

-- ── DELETAR PLANO ─────────────────────────────────────────────
RegisterNUICallback("vipAdminDeletePlan", function(data, cb)
    local res = lib.callback.await('mri_esc:admin:deletePlan', false, data.id)
    cb(res)
end)

-- ── Auto-push quando menu abre (case admin já estava na aba) ──
-- Garante que a lista é populada mesmo se o SendNUIMessage do client.lua
-- chegar antes do componente Alpine estar pronto
AddEventHandler('mri_esc:client:adminReady', function()
    PushAdminList()
end)

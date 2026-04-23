-- mri_esc - Servidor Refatorado (QBX)

-- Vamos registrar um callback simples no ox_lib para pegar o numero de players online
-- O restante das informacoes do jogador serao coletadas primariamente no cliente.

if GetResourceState('ox_lib') == 'started' then
    lib.callback.register('mri_esc:server:getPlayersOnline', function(source)
        return #GetPlayers()
    end)
else
    -- Fallback se nao usar ox_lib para callback (improvavel num Qbox, mas por seguranca)
    RegisterNetEvent('mri_esc:server:reqPlayersOnline', function()
        local src = source
        TriggerClientEvent('mri_esc:client:resPlayersOnline', src, #GetPlayers())
    end)
end

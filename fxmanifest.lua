fx_version 'cerulean'
game 'gta5'

shared_scripts {
    '@ox_lib/init.lua',
    'config/config.lua'
}

client_scripts {
    'script/client-side/*.lua'
}

server_scripts {
    'script/server-side/*.lua'
}

ui_page 'script/web-side/index.html'

files {
    'script/web-side/*',
    'script/web-side/**'
}

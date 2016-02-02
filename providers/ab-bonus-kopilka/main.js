﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
    'Connection': 'keep-alive'
};

function main() {
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');

    var baseurl = 'http://kopilka-bonus.ru/',
        sslUrl = 'https://kopilka-bonus.ru/';
	
	var html = AnyBalance.requestGet(baseurl, g_headers);

    if (!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    if (!isLoggedIn(html)) {
        var params = getParams(prefs);

        html = AnyBalance.requestPost(
            sslUrl + 'login/',
            params,
            addHeaders({
                Accept: 'application/json, text/javascript, */*; q=0.01',
                'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
                'Referer': baseurl + 'login/'
            })
        );

        var url = getParam(html, null, null, /<meta[^>]+http-equiv="refresh"[^>]*url=([^"]*)/i, replaceTagsAndSpaces);

        if (url) {
            html = AnyBalance.requestGet(url, g_headers);
        }

        if (!isLoggedIn(html)) {
            var error = getParam(html, null, null, /<h1[^>]*>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces);
            if(error)
                throw new AnyBalance.Error(error, null, true);

            throw new AnyBalance.Error('Не удалось получить баланс карты. Проблемы на сайте или сайт изменен.');
        }
    }

    var result = {success: true};

    getParam(html, result, 'cardnum', /<span[^>]+class=['"]?pan[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /<span[^>]+class=['"]?bonus[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

    if(AnyBalance.isAvailable('total')){
        html = AnyBalance.requestGet(sslUrl + 'personal/main/');
        getParam(html, result, 'total', /Сумма покупок в коалиции:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    }

    AnyBalance.setResult(result);
}


function getParams(prefs) {
    var modes = {
            CARD: '0',
            MAIL: '1',
            PHONE: '2'
        },
        params = {
            'actmode': 'send',
            'auth_cnumber': '77800016',
            'auth_altLogin': '',
            'auth_password': prefs.password
        };

    if (prefs.login.match(/77800016/)) {
        params['auth_altMode'] = modes.CARD;
        params['auth_cnumber'] = prefs.login;
    }
    else if (prefs.login.match(/^8\d+$/)) {
        params['auth_altMode'] = modes.PHONE;
        params['auth_altLogin'] = prefs.login;
    }
    else {
        params['auth_altMode'] = modes.MAIL;
        params['auth_altLogin'] = prefs.login;
    }

    return params;
}

function isLoggedIn(html) {
    return /\/logout/i.test(html);
}

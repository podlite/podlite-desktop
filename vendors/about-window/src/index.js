"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const fs_1 = require("fs");
const path = require("path");
function loadPackageJson(pkg_path) {
    try {
        return require(pkg_path);
    }
    catch (e) {
        return null;
    }
}
function detectPackageJson(specified_dir, app) {
    if (specified_dir) {
        const pkg = loadPackageJson(path.join(specified_dir, 'package.json'));
        if (pkg !== null) {
            return pkg;
        }
        else {
            console.warn('about-window: package.json is not found in specified directory path: ' + specified_dir);
        }
    }
    const app_name = app.name || app.getName();
    for (const mod_path of module.paths) {
        if (!path.isAbsolute(mod_path)) {
            continue;
        }
        const p = path.join(mod_path, '..', 'package.json');
        try {
            const stats = (0, fs_1.statSync)(p);
            if (stats.isFile()) {
                const pkg = loadPackageJson(p);
                if (pkg !== null && pkg.productName === app_name) {
                    return pkg;
                }
            }
        }
        catch (e) {
        }
    }
    return null;
}
function injectInfoFromPackageJson(info, app) {
    const pkg = detectPackageJson(info.package_json_dir, app);
    if (pkg === null) {
        return info;
    }
    if (!info.product_name) {
        info.product_name = pkg.productName;
    }
    if (!info.description) {
        info.description = pkg.description;
    }
    if (!info.license && pkg.license) {
        const l = pkg.license;
        info.license = typeof l === 'string' ? l : l.type;
    }
    if (!info.homepage) {
        info.homepage = pkg.homepage;
    }
    if (!info.bug_report_url && typeof pkg.bugs === 'object') {
        info.bug_report_url = pkg.bugs.url;
    }
    if (info.use_inner_html === undefined) {
        info.use_inner_html = false;
    }
    if (info.use_version_info === undefined) {
        info.use_version_info = true;
    }
    return info;
}
function normalizeParam(info_or_img_path) {
    if (!info_or_img_path) {
        throw new Error('First parameter of openAboutWindow() must not be empty. Please see the document: https://github.com/rhysd/electron-about-window/blob/master/README.md');
    }
    if (typeof info_or_img_path === 'string') {
        return { icon_path: info_or_img_path };
    }
    else {
        const info = info_or_img_path;
        if (!info.icon_path) {
            throw new Error("First parameter of openAboutWindow() must have key 'icon_path'. Please see the document: https://github.com/rhysd/electron-about-window/blob/master/README.md");
        }
        return Object.assign({}, info);
    }
}
function openAboutWindow(info_or_img_path) {
    let window = null;
    let info = normalizeParam(info_or_img_path);
    const ipc = electron_1.ipcMain !== null && electron_1.ipcMain !== void 0 ? electron_1.ipcMain : info.ipcMain;
    const app = electron_1.app !== null && electron_1.app !== void 0 ? electron_1.app : info.app;
    const BrowserWindow = electron_1.BrowserWindow !== null && electron_1.BrowserWindow !== void 0 ? electron_1.BrowserWindow : info.BrowserWindow;
    if (!app || !BrowserWindow || !ipc) {
        throw new Error("openAboutWindow() is called on non-main process. Set 'app', 'BrowserWindow' and 'ipcMain' properties in the 'info' argument of the function call");
    }
    if (window !== null) {
        window.focus();
        return window;
    }
    let base_path = info.about_page_dir;
    if (base_path === undefined || base_path === null || !base_path.length) {
        base_path = path.join(__dirname, '..');
    }
    const index_html = 'file://' + path.join(base_path, 'about.html');
    const options = Object.assign({
        width: 400,
        height: 400,
        useContentSize: true,
        titleBarStyle: 'hidden-inset',
        show: !info.adjust_window_size,
        icon: info.icon_path,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    }, info.win_options || {});
    window = new BrowserWindow(options);
    const on_win_adjust_req = (_, width, height, show_close_button) => {
        if (height > 0 && width > 0) {
            if (show_close_button) {
                window.setContentSize(width, height + 40);
            }
            else {
                window.setContentSize(width, height + 52);
            }
        }
    };
    const on_win_close_req = () => {
        window.close();
    };
    ipc.on('about-window:adjust-window-size', on_win_adjust_req);
    ipc.on('about-window:close-window', on_win_close_req);
    window.once('closed', () => {
        window = null;
        ipc.removeListener('about-window:adjust-window-size', on_win_adjust_req);
        ipc.removeListener('about-window:close-window', on_win_close_req);
    });
    window.loadURL(index_html);
    window.webContents.on('will-navigate', (e, url) => {
        e.preventDefault();
        electron_1.shell.openExternal(url);
    });
    window.webContents.on('new-window', (e, url) => {
        e.preventDefault();
        electron_1.shell.openExternal(url);
    });
    window.webContents.once('dom-ready', () => {
        const win_title = info.win_options ? info.win_options.title : null;
        delete info.win_options;
        info.win_options = { title: win_title };
        const app_name = info.product_name || app.name || app.getName();
        const version = app.getVersion();
        window.webContents.send('about-window:info', info, app_name, version);
        if (info.open_devtools) {
            if (process.versions.electron >= '1.4') {
                window.webContents.openDevTools({ mode: 'detach' });
            }
            else {
                window.webContents.openDevTools();
            }
        }
    });
    window.once('ready-to-show', () => {
        window.show();
    });
    window.setMenu(null);
    info = injectInfoFromPackageJson(info, app);
    return window;
}
exports.default = openAboutWindow;
//# sourceMappingURL=index.js.map
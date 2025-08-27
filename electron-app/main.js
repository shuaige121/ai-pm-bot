const { app, BrowserWindow, Menu, Tray, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let tray;
let botProcess;
let aiServerProcess;

// 服务状态
let serviceStatus = {
    bot: false,
    aiServer: false
};

// 创建系统托盘
function createTray() {
    tray = new Tray(path.join(__dirname, 'assets', 'tray-icon.png'));
    
    const contextMenu = Menu.buildFromTemplate([
        {
            label: '打开控制面板',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                } else {
                    createWindow();
                }
            }
        },
        { type: 'separator' },
        {
            label: '启动服务',
            click: () => startServices()
        },
        {
            label: '停止服务',
            click: () => stopServices()
        },
        { type: 'separator' },
        {
            label: '查看日志',
            submenu: [
                {
                    label: 'Bot日志',
                    click: () => openLog('/tmp/bot.log')
                },
                {
                    label: 'AI服务器日志',
                    click: () => openLog('/tmp/ai.log')
                }
            ]
        },
        { type: 'separator' },
        {
            label: '退出',
            click: () => {
                stopServices();
                app.quit();
            }
        }
    ]);
    
    tray.setToolTip('AI项目管理机器人');
    tray.setContextMenu(contextMenu);
}

// 创建主窗口
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        title: 'AI项目管理机器人',
        icon: path.join(__dirname, 'assets', 'icon.png')
    });
    
    mainWindow.loadFile('index.html');
    
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    
    // 最小化到托盘
    mainWindow.on('minimize', (event) => {
        event.preventDefault();
        mainWindow.hide();
    });
}

// 启动服务
function startServices() {
    const projectPath = path.join(__dirname, '..');
    
    // 启动AI服务器
    aiServerProcess = spawn('node', ['ai-server-claude.js'], {
        cwd: projectPath,
        detached: false
    });
    
    aiServerProcess.on('spawn', () => {
        serviceStatus.aiServer = true;
        updateStatus();
        showNotification('AI服务器已启动', '端口: 3001');
    });
    
    // 启动Bot
    setTimeout(() => {
        botProcess = spawn('node', ['bot-with-ai-server.js'], {
            cwd: projectPath,
            detached: false
        });
        
        botProcess.on('spawn', () => {
            serviceStatus.bot = true;
            updateStatus();
            showNotification('Telegram Bot已启动', '服务运行中');
        });
    }, 2000);
}

// 停止服务
function stopServices() {
    if (botProcess) {
        botProcess.kill();
        serviceStatus.bot = false;
    }
    
    if (aiServerProcess) {
        aiServerProcess.kill();
        serviceStatus.aiServer = false;
    }
    
    updateStatus();
    showNotification('服务已停止', '所有进程已终止');
}

// 更新状态显示
function updateStatus() {
    if (mainWindow) {
        mainWindow.webContents.send('status-update', serviceStatus);
    }
    
    // 更新托盘图标提示
    const status = serviceStatus.bot && serviceStatus.aiServer ? '运行中' : '已停止';
    tray.setToolTip(`AI项目管理机器人 - ${status}`);
}

// 显示通知
function showNotification(title, body) {
    if (mainWindow) {
        mainWindow.webContents.send('notification', { title, body });
    }
}

// 打开日志文件
function openLog(logPath) {
    if (fs.existsSync(logPath)) {
        shell.openPath(logPath);
    } else {
        dialog.showErrorBox('错误', '日志文件不存在');
    }
}

// 应用就绪
app.whenReady().then(() => {
    createTray();
    createWindow();
    
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// 退出前清理
app.on('before-quit', () => {
    stopServices();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
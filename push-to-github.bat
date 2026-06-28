@echo off
cd /d "%~dp0"
echo 正在推送到 GitHub...
git push origin main
if %errorlevel% equ 0 (
    echo ✅ 推送成功！
) else (
    echo ❌ 推送失败，请检查网络连接
)
pause

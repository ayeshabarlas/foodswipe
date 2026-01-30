@echo off
cd /d c:\Users\PMLS\Desktop\foodswipe
git add .
git commit -m "v2.2.14: Final build attempt"
git push origin main --force
git log -1 --oneline > git_log_final.txt
git status > git_status_final.txt

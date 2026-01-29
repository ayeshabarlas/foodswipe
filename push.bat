@echo off
git config user.email "ayeshabarlas636@gmail.com"
git config user.name "ayeshabarlas"
git add .
git commit -m "FIX: 404 Routing Final Attempt v2.1.5"
git push origin main --force
git push admin-repo main --force
git push admin-repo2 main --force
pause

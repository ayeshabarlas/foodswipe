@echo off
cd /d "c:\Users\PMLS\Desktop\foodswipe"
git config user.email "ayeshabarlas636@gmail.com"
git config user.name "ayeshabarlas"
git commit --allow-empty -m "FORCE BUILD TRIGGER v2.1.6"
git push origin main --force
git push admin-repo main --force
git push admin-repo2 main --force
echo Git operations completed.

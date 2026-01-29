# Final Push Script
git config user.email "ayeshabarlas636@gmail.com"
git config user.name "ayeshabarlas"
git add .
git commit --allow-empty -m "ULTIMATE VERCEL TRIGGER v2.1.5"
Write-Host "Pushing to origin main..."
git push origin main --force
Write-Host "Pushing to origin master..."
git push origin main:master --force
Write-Host "Pushing to admin-repo main..."
git push admin-repo main --force
Write-Host "Pushing to admin-repo2 main..."
git push admin-repo2 main --force
Write-Host "All pushes completed."

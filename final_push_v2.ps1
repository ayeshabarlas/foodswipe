git add .
git commit -m "Emergency Fix: Trigger build for all modified files and fix routing v2.2.11"
git push origin main --force
git push admin-repo main --force
git push admin-repo2 main --force
git rev-parse HEAD > commit_hash.txt

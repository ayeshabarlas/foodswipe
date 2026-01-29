try {
    git config user.email "ayeshabarlas636@gmail.com"
    git config user.name "ayeshabarlas"
    git add .
    $output = git commit -m "FIX: 404 Routing Final Attempt v2.1.5" 2>&1
    $output | Set-Content -Path "c:\Users\PMLS\Desktop\foodswipe\commit_error.txt"
    git push origin main --force 2>&1 | Add-Content -Path "c:\Users\PMLS\Desktop\foodswipe\commit_error.txt"
} catch {
    $_ | Set-Content -Path "c:\Users\PMLS\Desktop\foodswipe\commit_error.txt"
}

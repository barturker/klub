#!/bin/bash
# Time Travel: Git + DB birlikte geri al

echo "🕰️ Time Travel - Git + DB Restore"
echo "================================"

# Commit seç
echo "Hangi commit'e gitmek istiyorsun?"
echo "1. HEAD~1 (1 commit geri)"
echo "2. HEAD~3 (3 commit geri)"  
echo "3. HEAD~5 (5 commit geri)"
echo "4. Initial commit"
echo "5. Specific commit hash"

read -p "Seçim (1-5): " choice

case $choice in
  1) git checkout HEAD~1 ;;
  2) git checkout HEAD~3 ;;
  3) git checkout HEAD~5 ;;
  4) git checkout $(git rev-list --max-parents=0 HEAD) ;;
  5) 
    read -p "Commit hash: " hash
    git checkout $hash ;;
esac

echo ""
echo "✅ Git checkout tamamlandı"
echo "🔄 DB restore başlatılıyor..."
npm run db:restore
npx @tailwindcss/cli -i ./src/public/main.css -o ./build/public/main.css 
npx tsc --project tsconfig.backend.json
npx tsc --project tsconfig.frontend.json

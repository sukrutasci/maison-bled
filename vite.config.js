import { defineConfig } from 'vite';

// Chemins relatifs : le site fonctionne aussi bien en local qu'en sous-dossier
// (GitHub Pages : https://<compte>.github.io/maison-bled/).
export default defineConfig({
  base: './',
});

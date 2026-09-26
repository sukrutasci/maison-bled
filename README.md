# Maison 3D

Visualisation web 3D du projet : démolition de la maison traditionnelle en bois
et construction de la nouvelle maison sur le terrain en pente :
sous-sol (≈ 3,40 m hors sol au point bas) + RDC + étage au plan identique,
véranda fermée sur les deux niveaux (allège + vitrage), côté haut de la pente.

## Lancer

```bash
npm install
npm run dev
```

## Organisation

| Fichier | Rôle |
|---|---|
| `src/data/plan.js` | **Plan de la nouvelle maison** (pièces, murs, ouvertures, mobilier) en cm |
| `src/config.js` | Paramètres du site : pente, position de la maison, dimensions de l'existant |
| `src/buildings/newHouse.js` | Génère la maison 3D depuis `plan.js` |
| `src/buildings/furniture/kitchen.js` | Cuisine équipée (données dans `PLAN.kitchen`) |
| `src/buildings/existingHouse.js` | Maison en bois actuelle (d'après les photos) |
| `src/site/terrain.js` | Relief, terrassement du projet (déblai, remblai, fouille) |
| `src/site/roadAndParking.js` | Route, parking, murets, clôture barbelé |
| `src/site/plot.js` | Limites du terrain (`SITE.plot`) |
| `src/site/garden.js` | Massifs de rosiers (emplacements dans `SITE.newHouse.flowerBeds`) |
| `src/site/environment.js` | Ciel, soleil, montagnes, réseau électrique, minaret, clôture |
| `src/site/vegetation.js` | Noyers, fruitiers, conifères, noisetiers (aléatoire à graine fixe) |
| `src/lib/` | Textures procédurales et géométrie (toit à croupes, boîtes) |
| `public/reference/` | Plan, photos et vue satellite d'origine |

## Conventions

- **Plan** : cm, origine = angle arrière-gauche, x → droite, y → avant (véranda).
- **Monde 3D** : mètres, origine = centre de la maison, +Z = avant, +X = droite
  quand on fait face à la façade, y = 0 du groupe maison = sol fini de l'étage.
- Face avant = véranda ; **entrée sur le côté gauche** (cage d'escalier).

## Hypothèses à confirmer

- Positions exactes des fenêtres et portes (estimées sur la photo du plan).
- Escaliers en U superposés dans la même trémie : descente au sous-sol et
  montée à l'étage. À l'étage, la porte d'entrée devient une fenêtre.
- Balcon arrière présent aux deux niveaux (plan identique).
- Hauteur d'étage 3,00 m (≈ 2,75 m sous plafond), toit à 4 pans à 30°, débord 60 cm.
- Terrain : pente linéaire de 15° (`SITE.slopeDeg`). Devant la maison, la cour
  et la route forment un replat au niveau du RDC (comme la cour plate visible sur
  la photo de façade) ; la pente descend vers l'arrière et remonte après la route.
  Route de village en béton à 10 m de la véranda, au niveau du RDC. Parking
  1 m sous la route (mur de soutènement béton + clôture barbelé côté route) :
  entrée voiture en terre à gauche (talus naturel, terrain vague), places
  pavées à droite (2 places parallèles à la route), escalier vers la dalle
  d'entrée qui longe le côté gauche. Muret béton tout autour de la maison.
- Limites du terrain et nord (≈ 26° à gauche de l'axe arrière) relevés sur le
  croquis `public/reference/croquis-terrain.jpg`.
- Terrassement : plateforme de 2 m autour de la maison puis talus à 45°.
- Maison existante estimée à ~9 × 8 m.

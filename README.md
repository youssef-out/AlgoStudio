# Algorithme Studio — Visual Studio Code Edition (OFPPT)

Un environnement de développement complet (IDE Web) reprenant l'interface officielle de **Visual Studio Code**, spécialement conçu pour écrire, tester et exécuter le pseudo-code algorithmique en français conforme aux cours et examens de l'**OFPPT**.

---

## 🚀 Comment lancer le site ?

### Méthode 1 (Simple - 1 Clic sous Windows) :
Double-cliquez sur le fichier **`lancer_studio.bat`**. Il lance automatiquement le serveur local et ouvre votre navigateur par défaut sur :
`http://localhost:8080/index.html`

### Méthode 2 (Ligne de commande Python) :
```bash
python server.py
```

### Méthode 3 (Directement dans le navigateur) :
Double-cliquez simplement sur le fichier **`index.html`**.

---

## ✨ Fonctionnalités Principales

1. **Interface authentique Visual Studio Code** :
   - Thème officiel **VS Code Dark+** avec barre de titre, Activity Bar, barre latérale et barre d'état.
   - Éditeur de code Monaco (le même que dans VS Code) avec coloration syntaxique complète, numérotation de lignes, minimap et autocomplétion.
   - Barre d'insertion rapide en un clic pour les symboles difficiles à taper : `← Affecter`, `SI ... ALORS`, `POUR`, `TANT QUE`, `RÉPÉTER`, `SELON`, `ÉCRIRE()`, `LIRE()`, et bouton `🧹 Formater`.

2. **Moteur d'Exécution Algorithmique Français (Conforme au PDF)** :
   - **Types de base** : `entier`, `réel`, `chaîne`, `caractère`, `booléen`.
   - **Affectation** : `variable ← expression` (supporte aussi `<-` et `:=`).
   - **Opérateurs arithmétiques** : `+`, `-`, `*`, `/`, `mod` (modulo), `div` (division entière), `^` (puissance).
   - **Opérateurs de comparaison** : `=`, `<>`, `!=`, `<`, `>`, `<=`, `>=`.
   - **Opérateurs logiques** : `ET`, `OU`, `NON`.
   - **Entrées / Sorties interactives** : `LIRE(...)` et `ÉCRIRE(...)`.
   - **Structures conditionnelles** : `SI ... ALORS ... SINON ... FINSI` et `SELON ... FAIRE ... CAS ... FINSELON`.
   - **Structures répétitives** :
     - `POUR i ← début À fin [PAS pas] FAIRE ... FINPOUR`
     - `TANT QUE condition FAIRE ... FINTANTQUE`
     - `RÉPÉTER ... JUSQU'À condition`

3. **Terminal Interactif** :
   - Quand l'algorithme rencontre `LIRE(variable)`, le terminal demande la saisie en direct avec un curseur interactif.
   - Couleurs syntaxiques pour les informations, les sorties, les erreurs et le temps d'exécution.

4. **Inspecteur de Variables en temps réel (Watch)** :
   - Tableau dynamique affichant toutes les variables en mémoire, leur type (`entier`, `réel`, etc.) et leur valeur instantanée.

5. **Débogueur Pas à Pas & Breakpoints** :
   - Exécution pas à pas (touche `F10` ou bouton `⏯ Pas à pas`) avec surlignage de la ligne en cours d'exécution.
   - Points d'arrêt (Breakpoints) en cliquant directement sur la marge des numéros de ligne (point rouge).
   - Réglage de la vitesse d'exécution (Instantané, 200ms, 500ms, 1000ms).

6. **Traducteur de Code en direct vers Python 3 & Langage C** :
   - Traduit automatiquement votre algorithme en Python 3 (`input()`, `print()`, `for in range()`, `match/case`, `while`).
   - Traduit en code source C (`printf`, `scanf`, structures de contrôle).
   - Bouton de copie en un clic.

7. **Bibliothèque d'Exemples intégrée tirée du PDF du cours** :
   - *Surface d'un Cercle* (p. 39)
   - *Surface d'un Rectangle* (p. 25)
   - *Communication / Dialogue Nom & Âge* (p. 35)
   - *Expression Âge dans 5 ans* (p. 37)
   - *Test Majeur / Mineur* (p. 43)
   - *Jours de la semaine avec SELON* (p. 46)
   - *Compteur Boucle POUR* (p. 48 & 49)
   - *Contrôle de saisie de note entre 0 et 20 avec RÉPÉTER* (p. 51)
   - *Boucle TANT QUE* (p. 53)
   - *Conversion Décimal vers Binaire* (p. 14-16)

---

## ⌨️ Raccourcis Clavier

- **F5** : Exécuter l'algorithme
- **F10** : Exécuter une instruction pas à pas
- **Maj + F5** : Arrêter l'exécution
- **Ctrl + S** : Télécharger / Enregistrer le fichier `.algo`
- **Shift + Alt + F** : Formater et indenter le code automatiquement

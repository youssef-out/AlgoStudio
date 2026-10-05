# AlgoStudio ⚡

Un environnement de développement complet (IDE Web) moderne et léger, conçu pour écrire, tester et simuler des algorithmes en pseudo-code français avec exécution interactive et autocomplétion intelligente.

---

## 🌐 Démo en ligne (GitHub Pages)

👉 **Accéder directement à AlgoStudio :**  
### **[https://youssef-out.github.io/AlgoStudio/](https://youssef-out.github.io/AlgoStudio/)**

> **Dépôt GitHub :** [https://github.com/youssef-out/AlgoStudio](https://github.com/youssef-out/AlgoStudio)

---

## ✨ Fonctionnalités Principales

- **Système d'onglets multiples (Tabs)** : Travaillez sur plusieurs fichiers `.algo` en parallèle, basculez entre eux, et renommez-les par double-clic.
- **Écran d'accueil interactif (Welcome Screen)** :
  - Boutons centraux pour créer ou ouvrir rapidement un fichier.
  - **Historique des fichiers récents** sauvegardés localement (`localStorage`) avec date de dernière modification.
- **IntelliSense & Autocomplétion intelligente** :
  - Tapez la première lettre (ex: `s`, `p`, `e`, `l`) et une liste de complétion apparaît instantanément avec les structures prêtes à l'emploi (`SI ... ALORS`, `POUR`, `TANT QUE`, `ÉCRIRE()`, `LIRE()`, etc.).
- **Terminal interactif (Console & Résultat)** :
  - Support de l'instruction `LIRE(variable)` avec invite de saisie directe en temps réel (CLI Prompt).
  - Indicateur d'état interactif (`● Prêt`, `● En cours...`, `● Erreur`) et chronomètre de durée d'exécution.
- **Gestionnaire de fichiers natif** :
  - Enregistrement direct sur votre ordinateur via la boîte de dialogue système Windows (*Enregistrer sous*).
  - Filtrage strict à l'ouverture pour n'accepter que les fichiers d'algorithme (`*.algo`).
- **Synchronisation du nom d'algorithme** : Le titre de l'onglet se met à jour automatiquement dès que vous modifiez l'instruction `ALGORITHME Nom`.
- **Routage Zero-Flash** : Mémorisation de l'onglet actif lors du rafraîchissement de la page (F5) sans aucun clignotement de l'écran d'accueil.

---

## 📘 Syntaxe Algorithmique Supportée

| Élément | Syntaxe acceptée |
| :--- | :--- |
| **En-tête** | `ALGORITHME NomProgramme` |
| **Variables** | `VARIABLE x : entier` / `VARIABLES a, b : réel` |
| **Types de base** | `entier`, `réel`, `chaîne`, `caractère`, `booléen` |
| **Affectation** | `variable ← valeur` *(accepte aussi `<-` et `:=`)* |
| **Entrées / Sorties** | `LIRE(nom)` / `ÉCRIRE("Message : ", x)` |
| **Conditions** | `SI condition ALORS ... SINON ... FINSI` |
| **Choix multiples** | `SELON variable FAIRE ... CAS 1 : ... CAS AUTRE : ... FINSELON` |
| **Boucle POUR** | `POUR i ← 1 À 10 FAIRE ... FINPOUR` |
| **Boucle TANT QUE** | `TANT QUE condition FAIRE ... FINTANTQUE` |
| **Boucle RÉPÉTER** | `RÉPÉTER ... JUSQU'À condition` |
| **Opérateurs** | `+`, `-`, `*`, `/`, `mod`, `div`, `^`, `=`, `<>`, `<`, `>`, `<=`, `>=`, `ET`, `OU`, `NON` |

---

## ⌨️ Raccourcis Clavier

- **F5** : Lancer / Tester l'algorithme
- **Maj + F5** : Arrêter l'exécution
- **Ctrl + S** : Enregistrer le fichier `.algo` sur votre PC
- **Ctrl + O** : Ouvrir un fichier `.algo`
- **Ctrl + N** : Créer un nouvel onglet

---

## 👨‍💻 Auteur

Développé par **[youssef-out](https://github.com/youssef-out)**

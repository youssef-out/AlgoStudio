/**
 * Algorithme Studio - Exemples officiels conformes au cours OFPPT
 */

const ALGO_EXAMPLES = [
    {
        id: "surface_cercle",
        title: "1. Surface d'un Cercle (Page 39)",
        category: "Calculs de base",
        filename: "SurfaceCercle.algo",
        description: "Calcul de la surface d'un cercle avec la formule 3.14 * r²",
        code: `ALGORITHME SurfaceCercle
VARIABLE rayon, surface : réel
DÉBUT
    ÉCRIRE("=== CALCUL DE LA SURFACE D'UN CERCLE ===")
    ÉCRIRE("Entrez le rayon du cercle : ")
    LIRE(rayon)
    surface ← 3.14 * rayon * rayon
    ÉCRIRE("La surface du cercle est : ", surface)
FIN`
    },
    {
        id: "surface_rectangle",
        title: "2. Surface d'un Rectangle (Page 25)",
        category: "Calculs de base",
        filename: "SurfaceRectangle.algo",
        description: "Calcul de la surface d'un rectangle à partir de sa longueur et largeur",
        code: `ALGORITHME SurfaceRectangle
VARIABLE longueur, largeur, surface : réel
DÉBUT
    ÉCRIRE("=== SURFACE DU RECTANGLE ===")
    ÉCRIRE("Entrez la longueur : ")
    LIRE(longueur)
    ÉCRIRE("Entrez la largeur : ")
    LIRE(largeur)
    surface ← longueur * largeur
    ÉCRIRE("La surface du rectangle est : ", surface)
FIN`
    },
    {
        id: "presentation",
        title: "3. Communication et Dialogue (Page 35)",
        category: "Entrées / Sorties",
        filename: "Presentation.algo",
        description: "Demande du nom et de l'âge de l'utilisateur",
        code: `ALGORITHME Presentation
VARIABLE nom : chaîne
VARIABLE age : entier
DÉBUT
    ÉCRIRE("Entrez votre nom :")
    LIRE(nom)
    ÉCRIRE("Entrez votre âge :")
    LIRE(age)
    ÉCRIRE("Bonjour ", nom, ", vous avez ", age, " ans.")
FIN`
    },
    {
        id: "age_futur",
        title: "4. Expression Arithmétique (Page 37)",
        category: "Entrées / Sorties",
        filename: "AgeFutur.algo",
        description: "Demande du prénom et de l'âge puis calcul de l'âge dans 5 ans",
        code: `ALGORITHME AgeFutur
VARIABLE prenom : chaîne
VARIABLE age : entier
DÉBUT
    ÉCRIRE("Entrez votre prénom :")
    LIRE(prenom)
    ÉCRIRE("Entrez votre âge :")
    LIRE(age)
    ÉCRIRE("Bonjour ", prenom, ", dans 5 ans vous aurez ", age + 5, " ans.")
FIN`
    },
    {
        id: "condition_majeur",
        title: "5. Condition SI / SINON (Page 43)",
        category: "Structures conditionnelles",
        filename: "Majeur.algo",
        description: "Vérifier si une personne est majeure ou mineure (seuil 18 ans)",
        code: `ALGORITHME Majeur
VARIABLE age : entier
DÉBUT
    ÉCRIRE("Entrez votre âge : ")
    LIRE(age)
    SI age >= 18 ALORS
        ÉCRIRE("Vous êtes majeur.")
    SINON
        ÉCRIRE("Vous êtes mineur.")
    FINSI
FIN`
    },
    {
        id: "selon_cas",
        title: "6. Choix multiples avec SELON (Page 46)",
        category: "Structures conditionnelles",
        filename: "JourDeLaSemaine.algo",
        description: "Affiche le nom du jour correspondant au nombre (1 à 7)",
        code: `ALGORITHME JourDeLaSemaine
VARIABLE n : entier
DÉBUT
    ÉCRIRE("Entrez un nombre entre 1 et 7 : ")
    LIRE(n)
    SELON n FAIRE
        CAS 1 : ÉCRIRE("Lundi")
        CAS 2 : ÉCRIRE("Mardi")
        CAS 3 : ÉCRIRE("Mercredi")
        CAS 4 : ÉCRIRE("Jeudi")
        CAS 5 : ÉCRIRE("Vendredi")
        CAS 6 : ÉCRIRE("Samedi")
        CAS 7 : ÉCRIRE("Dimanche")
        CAS AUTRE : ÉCRIRE("Nombre invalide ! Il faut un nombre de 1 à 7.")
    FINSELON
FIN`
    },
    {
        id: "boucle_pour",
        title: "7. Boucle POUR (Page 48 & 49)",
        category: "Structures répétitives",
        filename: "BouclePour.algo",
        description: "Répéter un nombre précis de fois (compter de 1 à 10)",
        code: `ALGORITHME BouclePour
VARIABLE i : entier
DÉBUT
    ÉCRIRE("Affichage des nombres de 1 à 10 :")
    POUR i ← 1 À 10 FAIRE
        ÉCRIRE("i = ", i)
    FINPOUR
    ÉCRIRE("Boucle terminée avec succès !")
FIN`
    },
    {
        id: "boucle_repeter",
        title: "8. Boucle RÉPÉTER ... JUSQU'À (Page 51)",
        category: "Structures répétitives",
        filename: "ControleSaisieNote.algo",
        description: "Demande répétée d'une note valide entre 0 et 20",
        code: `ALGORITHME ValidationNote
VARIABLE note : réel
DÉBUT
    RÉPÉTER
        ÉCRIRE("Entrez une note valide comprise entre 0 et 20 : ")
        LIRE(note)
        SI (note < 0 OU note > 20) ALORS
            ÉCRIRE("Erreur : La note doit être comprise entre 0 et 20 !")
        FINSI
    JUSQU'À (note >= 0 ET note <= 20)
    ÉCRIRE("Félicitations, note acceptée : ", note, "/20")
FIN`
    },
    {
        id: "boucle_tantque",
        title: "9. Boucle TANT QUE (Page 53)",
        category: "Structures répétitives",
        filename: "TantQueExemple.algo",
        description: "Tant que le nombre est différent de 0, on continue la saisie",
        code: `ALGORITHME BoucleTantQue
VARIABLE nombre : entier
DÉBUT
    ÉCRIRE("Entrez un nombre entier (tapez 0 pour arrêter) : ")
    LIRE(nombre)
    TANT QUE nombre <> 0 FAIRE
        ÉCRIRE("Vous avez tapé : ", nombre)
        ÉCRIRE("Entrez un autre nombre (0 pour arrêter) : ")
        LIRE(nombre)
    FINTANTQUE
    ÉCRIRE("Vous avez saisi 0. Fin de l'algorithme.")
FIN`
    },
    {
        id: "decimal_binaire",
        title: "10. Conversion Décimal vers Binaire (Page 14-16)",
        category: "Exercices avancés",
        filename: "DecimalVersBinaire.algo",
        description: "Conversion d'un nombre décimal en binaire par divisions successives",
        code: `ALGORITHME DecimalVersBinaire
VARIABLE n, quotient, reste : entier
VARIABLE binaire : chaîne
DÉBUT
    ÉCRIRE("=== CONVERSION DÉCIMAL VERS BINAIRE ===")
    ÉCRIRE("Entrez un nombre décimal positif : ")
    LIRE(n)
    
    quotient ← n
    binaire ← ""
    
    SI quotient = 0 ALORS
        binaire ← "0"
    SINON
        TANT QUE quotient > 0 FAIRE
            reste ← quotient mod 2
            binaire ← reste + binaire
            quotient ← quotient div 2
        FINTANTQUE
    FINSI
    
    ÉCRIRE("Le nombre ", n, " en binaire (base 2) est : ", binaire)
FIN`
    }
];

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ALGO_EXAMPLES;
}

// Sur Vercel le filesystem est en lecture seule (sauf /tmp, qui n'est pas
// persistant entre les invocations). On ne peut donc PAS écrire des fichiers
// sur disque de façon durable. Solution simple et sans dépendance externe :
// on stocke soit un lien externe (http/https), soit l'image elle-même encodée
// en base64 (data URI) directement dans la colonne `images.url` (TEXT) de la DB.

const MAX_BASE64_SIZE = 5 * 1024 * 1024; // ~5MB en base64
const MIN_BASE64_SIZE = 3000; // une vraie photo compressée fait toujours plus que ça

async function uploadImage(imageUrl, type = 'gallery') {
    if (!imageUrl || typeof imageUrl !== 'string') {
        throw new Error('INVALID_IMAGE');
    }

    // Cas 1 : data URI (photo envoyée depuis le téléphone/PC, convertie en base64 côté front)
    if (imageUrl.startsWith('data:image')) {
        if (imageUrl.length > MAX_BASE64_SIZE) {
            throw new Error('IMAGE_TOO_LARGE');
        }
        // Filet de sécurité : si le front a quand même envoyé une image "vide"
        // (bug de décodage sur certains appareils), on refuse plutôt que de
        // sauvegarder une image cassée dans la galerie.
        if (imageUrl.length < MIN_BASE64_SIZE) {
            throw new Error('BLANK_IMAGE');
        }
        return {
            url: imageUrl,
            filename: `${type}_${Date.now()}`,
            path: null
        };
    }

    // Cas 2 : lien externe direct (http/https) — on le garde tel quel
    if (/^https?:\/\//i.test(imageUrl)) {
        return {
            url: imageUrl,
            filename: `${type}_${Date.now()}`,
            path: null
        };
    }

    throw new Error('INVALID_IMAGE');
}

async function deleteImage(url) {
    // Rien à supprimer physiquement : soit c'est un lien externe (rien à nous),
    // soit c'est une data URI stockée directement dans la ligne DB (elle sera
    // supprimée avec la ligne elle-même via DELETE FROM images).
    return true;
}

module.exports = {
    uploadImage,
    deleteImage
};

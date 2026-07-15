const { listObjectURLs } = require("../s3/s3");


const getPublicAvatars = (req, res) => {
    const bucketName = 'eksathi';
    const region = 'ap-south-1';
    const folderName = 'public/images/avatars';
    listObjectURLs(bucketName, region, folderName)
        .then(objectURLs => {
            // console.log('Object URLs:', objectURLs);
            return res.status(200).json({
                message: "Avatar list found",
                avatarList: objectURLs
            });
        })
        .catch(err => {
            console.error('Error:', err);
            return res.status(500).json({
                message: "Internal Server Error",
            });
        });

};

module.exports = {
    getPublicAvatars
}
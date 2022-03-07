// Returns a Promise that resolves after "ms" Milliseconds
const timer = ms => new Promise(res => setTimeout(res, ms));

exports.getTimer = async() => {
    return await timer();
};

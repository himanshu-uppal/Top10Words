
import Router from 'express';
import { getTop10WordsFromEssays } from '../Processors/Essays/index.js';

const router = Router();

router.get('/top10words', async (req, res) => {

    try {
        const fileName = 'endg-urls.txt';
        const top10WordsResponse = await getTop10WordsFromEssays(fileName);
        return res.status(200).json(top10WordsResponse);
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
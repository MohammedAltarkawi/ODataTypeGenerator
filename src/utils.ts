import axios from 'axios';

export const fetchMetadata = async (METADATA_URL: string, USERNAME: string, PASSWORD: string) => {
    try {
        console.log('Attempting to fetch metadata...');
        const response = await axios.get(METADATA_URL, {
            auth: {
                username: USERNAME,
                password: PASSWORD
            }
        });
        console.log('Metadata fetched successfully');
        return response.data;
    } catch (error) {
        console.error('Error fetching metadata:', error);
        throw error;
    }
};

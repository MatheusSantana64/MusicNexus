import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { getTags } from '../database/databaseOperations';
import TagsList from '../components/TagsList';
import { tagsScreenStyles as styles } from '../styles/screenStyles';

export function Tags() {
    const [tags, setTags] = useState([]);

    useEffect(() => {
        const fetchTags = async () => {
            const fetchedTags = await getTags();
            setTags(fetchedTags);
        };

        fetchTags();
    }, []);

    return (
        <View style={styles.screen}>
            <TagsList
                tags={tags}
                refreshTags={async () => {
                    const fetchedTags = await getTags();
                    setTags(fetchedTags);
                }}
            />
        </View>
    );
}

export default Tags;
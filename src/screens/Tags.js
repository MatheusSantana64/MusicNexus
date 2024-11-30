// src/screens/Tags.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getTags } from '../database/databaseOperations';
import TagsList from '../components/TagsList';
import { globalStyles } from '../styles/global';

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

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: globalStyles.defaultBackgroundColor,
        paddingTop: 4,
        paddingHorizontal: 5,
    },
    title: {
        fontSize: 24,
        color: 'white',
    },
});

export default Tags;
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, ScrollView, Image } from 'react-native';
import axios from 'axios';

export function Explore() {
 const [searchQuery, setSearchQuery] = useState('');
 const [searchResults, setSearchResults] = useState([]);

 useEffect(() => {
    if (searchQuery) {
      searchMusicBrainz();
    }
 }, [searchQuery]);

 const searchMusicBrainz = async () => {
    try {
      const response = await axios.get(`https://musicbrainz.org/ws/2/release?query=${encodeURIComponent(searchQuery)}&fmt=json`);
      const resultsWithCoverArt = response.data.releases.map(result => ({
        ...result,
        coverArtUrl: 'https://via.placeholder.com/50', // Placeholder URL
      }));
      setSearchResults(resultsWithCoverArt);
    } catch (error) {
      console.error('Error searching MusicBrainz:', error);
    }
 };

 return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, color: 'white', backgroundColor: '#090909' }}>
      <TextInput
        placeholder="Search"
        placeholderTextColor="gray"
        style={{ backgroundColor: '#1e272e', borderRadius: 8, color: 'white', height: 32, padding: 16, width: '80%' }}
        onChangeText={setSearchQuery}
      />
      <Button title="Search" onPress={searchMusicBrainz} />
      <ScrollView>
        {searchResults.map((result, index) => (
          <View key={index} style={{ marginBottom: 10, flexDirection: 'row', alignItems: 'center' }}>
            <Image
              source={{ uri: result.coverArtUrl }}
              style={{ width: 50, height: 50, marginRight: 10 }}
            />
            <View>
              <Text style={{ color: 'white' }}>{result.title}</Text>
              <Text style={{ color: 'white' }}>Artist: {result['artist-credit'][0].name}</Text>
              <Text style={{ color: 'white' }}>Album: {result['release-group'].title}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
 );
}
import React, { useState } from 'react';
import { View, TextInput, ScrollView, Text, TouchableOpacity } from 'react-native';
import axios from 'axios';
import Card from '../components/Card'; // Import the Card component

export function Explore() {
 const [searchQuery, setSearchQuery] = useState('');
 const [searchResults, setSearchResults] = useState([]);
 const [activeTab, setActiveTab] = useState('Songs'); // State for active tab

 const searchMusicBrainz = async () => {
    try {
       const response = await axios.get(`https://musicbrainz.org/ws/2/release?query=${encodeURIComponent(searchQuery)}&fmt=json`, {
         headers: {
           'User-Agent': 'MusicNexus/0.0.1 (matheus.santana6415@gmail.com)',
         },
       });
       let resultsWithCoverArt = response.data.releases.map(result => ({
         ...result,
         coverArtUrl: 'https://via.placeholder.com/50', // Placeholder URL
       }));

       // Adjusted filtering logic based on the active tab
       if (activeTab === 'Songs') {
         resultsWithCoverArt = resultsWithCoverArt.filter(result => result.hasOwnProperty('title')); // Filtering for songs based on 'title'
       } else if (activeTab === 'Artists') {
         resultsWithCoverArt = resultsWithCoverArt.filter(result => result['artist-credit'] && result['artist-credit'].length > 0); // Filtering for artists based on 'artist-credit'
       } else if (activeTab === 'Albums') {
         resultsWithCoverArt = resultsWithCoverArt.filter(result => result['release-group'] && result['release-group'].hasOwnProperty('title')); // Filtering for albums based on 'release-group'
       }

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
          onSubmitEditing={searchMusicBrainz} // Search when press Enter
        />

        {/* Tabs */}
        <View style={{ flexDirection: 'row', marginTop: 8, marginBottom: 8 }}>
          <TouchableOpacity onPress={() => setActiveTab('Songs')} style={{ marginRight: 8 }}>
            <Text style={{ color: activeTab === 'Songs' ? 'white' : 'gray' }}>Songs</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('Artists')} style={{ marginRight: 8 }}>
            <Text style={{ color: activeTab === 'Artists' ? 'white' : 'gray' }}>Artists</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('Albums')}>
            <Text style={{ color: activeTab === 'Albums' ? 'white' : 'gray' }}>Albums</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ width: '100%' }}>
          {searchResults.map((result, index) => (
            <Card key={index} result={result} />
          ))}
        </ScrollView>
      </View>
    );
}
import React from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';

const SearchBar = ({ searchText, setSearchText, showUnrated, setShowUnrated }) => {
    return (
        <View style={{ flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '80%' }}>
                <TextInput
                    placeholder="Search"
                    placeholderTextColor='white'
                    style={{
                        backgroundColor: '#1e272e',
                        borderRadius: 8,
                        color: 'white',
                        height: 32,
                        paddingHorizontal: 16,
                        width: '100%',
                        fontSize: 12,
                    }}
                    onChangeText={text => setSearchText(text)}
                />
            </View>
            <TouchableOpacity onPress={() => setShowUnrated(!showUnrated)}>
                <Text style={{ color: showUnrated ? 'red' : 'gray', marginLeft: 16, marginTop: 16 }}>Not Rated</Text>
            </TouchableOpacity>
        </View>
    );
};

export default SearchBar;
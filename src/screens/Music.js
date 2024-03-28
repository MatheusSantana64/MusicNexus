import { View, TextInput } from 'react-native';

export function Music(){
    return (
        <View
            style={{
                flex: 1,
                alignItems: 'center',
                backgroundColor: '#090909',
                padding: 16,
            }}
        >
        <TextInput
            placeholder="Search"
            placeholderTextColor="gray"
            style={{
                backgroundColor: '#1e272e',
                borderRadius: 8,
                color: 'white',
                height: 32,
                padding: 16,
            }}
        />
        </View>
    );
}
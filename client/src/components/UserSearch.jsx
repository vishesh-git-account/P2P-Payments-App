import { useState, useEffect } from 'react';
import axios from 'axios';

export default function UserSearch({ onSelectUser }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    // Debounce logic: Wait 300ms after the user stops typing to make the API call
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length >= 2) {
        setLoading(true);
        try {
          const token = localStorage.getItem('token');
          const res = await axios.get(`/api/users/search?q=${searchTerm}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setResults(res.data);
        } catch (error) {
          console.error("Error searching users", error);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]); // Clear results if search is too short
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSelect = (user) => {
    setSelectedUser(user);
    setSearchTerm(''); // Clear search bar
    setResults([]); // Hide dropdown
    onSelectUser(user._id); // Pass ID up to the parent form
  };

  return (
    <div className="relative w-full mb-6">
      <label className="block text-sm font-bold text-gray-700 mb-2">Search Recipient</label>
      
      {/* If a user is selected, show their info instead of the search bar */}
      {selectedUser ? (
        <div className="flex justify-between items-center bg-blue-50 border border-blue-200 p-3 rounded-lg">
          <div>
            <p className="font-bold text-blue-800">{selectedUser.name}</p>
            <p className="text-xs text-brand">{selectedUser.email}</p>
          </div>
          <button 
            onClick={() => { setSelectedUser(null); onSelectUser(null); }}
            className="text-red-500 text-sm font-bold hover:underline"
          >
            Change
          </button>
        </div>
      ) : (
        <input
          type="text"
          placeholder="Type a name or email (e.g. John)"
          className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      )}

      {/* The live dropdown results */}
      {loading && <p className="text-xs text-gray-500 mt-2">Searching...</p>}
      
      {results.length > 0 && !selectedUser && (
        <ul className="absolute z-10 w-full bg-white border border-gray-200 mt-1 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {results.map((user) => (
            <li 
              key={user._id} 
              className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-0"
              onClick={() => handleSelect(user)}
            >
              <p className="font-bold text-gray-800">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/auth-context';

const DocumentForm = ({ setDocuments, closeModal }) => {
  const { token } = useAuth();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [version, setVersion] = useState('');
  const [revision, setRevision] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('title', title);
    formData.append('category', category);
    formData.append('version', version);
    formData.append('revision', revision);
    formData.append('description', description);
    formData.append('file', file);

    try {
      const res = await axios.post('http://localhost:5002/api/documents', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
        },
      });
      setDocuments((prev) => [...prev, res.data]);
      closeModal();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create document');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className={`bg-white p-6 rounded-lg shadow-lg w-full max-w-md ${loading ? 'blur-sm' : ''}`}>
        <h2 className="text-2xl font-semibold mb-4">Add New Policy</h2>
        {error && <p className="text-red-600 mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-600">Title</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-600">Category</label>
            <input
              id="category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label htmlFor="version" className="block text-sm font-medium text-gray-600">Version</label>
            <input
              id="version"
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label htmlFor="revision" className="block text-sm font-medium text-gray-600">Revision</label>
            <input
              id="revision"
              type="number"
              value={revision}
              onChange={(e) => setRevision(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-600">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label htmlFor="file" className="block text-sm font-medium text-gray-600">Upload File</label>
            <input
              id="file"
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={closeModal}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
        {loading && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-center text-gray-600 mt-2">{progress}%</p>
          </div>
        )}
      </div>
      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <svg className="animate-spin h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6l4 4"></path>
          </svg>
        </div>
      )}
    </div>
  );
};

export default DocumentForm;
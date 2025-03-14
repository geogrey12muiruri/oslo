import React from 'react';

const DocumentsTable = ({ documents }) => {
  return (
    <table className="min-w-full bg-white">
      <thead>
        <tr>
          <th className="py-2">Title</th>
          <th className="py-2">Author</th>
          <th className="py-2">Published Date</th>
          <th className="py-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        {documents.map(document => (
          <tr key={document.id}>
            <td className="py-2">{document.title}</td>
            <td className="py-2">{document.author}</td>
            <td className="py-2">{document.publishedDate}</td>
            <td className="py-2">
              <button className="mr-2 text-blue-500">View</button>
              <button className="mr-2 text-green-500">Edit</button>
              <button className="text-red-500">Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default DocumentsTable;
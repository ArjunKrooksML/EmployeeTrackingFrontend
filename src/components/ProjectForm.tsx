import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { api, type Project } from '../lib/api';

interface ProjectFormProps {
  project: Project | null;
  onClose: () => void;
}

export default function ProjectForm({ project, onClose }: ProjectFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    client_name: '',
    address: '',
    start_date: '',
    completion_date: '',
  });
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        client_name: project.client_name,
        address: project.address,
        start_date: project.start_date || '',
        completion_date: project.completion_date || '',
      });
      setIsCompleted(!!project.completion_date);
    } else {
      setIsCompleted(false);
    }
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isCompleted && !formData.completion_date) {
      alert('Please select a completion date or uncheck "Mark as completed".');
      setLoading(false);
      return;
    }

    const payload = {
      name: formData.name.trim(),
      client_name: formData.client_name.trim(),
      address: formData.address.trim(),
      start_date: formData.start_date,
      completion_date: isCompleted ? formData.completion_date : null,
    };

    try {
    if (project) {
        await api.projects.update(project.project_id, payload);
      } else {
        await api.projects.create(payload);
      }
        onClose();
    } catch (error) {
      console.error('Error saving project:', error);
      alert(error instanceof Error ? error.message : 'Failed to save project');
    }

    setLoading(false);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="flex justify-between items-center p-6 border-b">
        <h2 className="text-2xl font-bold text-gray-800">
          {project ? 'Edit Project' : 'Create New Project'}
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project Name
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client Name
          </label>
          <input
            type="text"
            name="client_name"
            value={formData.client_name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address
          </label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows={3}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
            Completion Date
            </label>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="completed"
              checked={isCompleted}
              onChange={(e) => {
                setIsCompleted(e.target.checked);
                if (!e.target.checked) {
                  setFormData((prev) => ({ ...prev, completion_date: '' }));
                }
              }}
              className="h-4 w-4 text-green-600 border-gray-300 rounded"
            />
            <label htmlFor="completed" className="text-sm text-gray-700">
              Mark as completed
            </label>
          </div>
          {isCompleted && (
            <input
              type="date"
              name="completion_date"
              value={formData.completion_date}
              onChange={handleChange}
              className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : project ? 'Update Project' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
}

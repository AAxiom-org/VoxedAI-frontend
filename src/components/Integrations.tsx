import { useState } from 'react';
import { FaGithub } from "react-icons/fa";
import { SiNotion } from "react-icons/si";

const IntegrationsPage = () => {
  // State for active tab
  const [activeTab, setActiveTab] = useState<'github' | 'notion'>('github');
  
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Integrations</h1>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            className={`flex gap-2 px-4 py-2 font-medium ${
              activeTab === 'github' 
                ? 'text-primary border-b-2 border-primary' 
                : 'text-adaptive'
            }`}
            onClick={() => setActiveTab('github')}
          >
            <FaGithub size={24} />
            GitHub
          </button>
          <button
            className={`flex gap-2 px-4 py-2 font-medium ${
              activeTab === 'notion' 
                ? 'text-primary border-b-2 border-primary' 
                : 'text-adaptive'
            }`}
            onClick={() => setActiveTab('notion')}
          >
            <SiNotion size={24} />
            Notion
          </button>
        </div>
        
        {/* Empty content area */}
        <div className="flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">
            {activeTab === 'github' 
              ? 'GitHub integration will be displayed here' 
              : 'Notion integration will be displayed here'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default IntegrationsPage;
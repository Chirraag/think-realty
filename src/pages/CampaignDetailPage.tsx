import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Phone, Download, AlertTriangle, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, doc, getDoc, getDocs, updateDoc, query, where } from 'firebase/firestore';
import type { Campaign } from '../types';

interface Contact {
  id: string;
  name: string;
  phone_number: string;
  called: boolean;
  call_id?: string;
  error?: string;
}

interface CallData {
  id: string;
  timestamp: number;
  durationSeconds: number;
  endedReason: string;
  recordingUrl: string;
  phoneNumber: {
    number: string;
  };
  customer: {
    number: string;
  };
  messages: Array<{
    message: string;
    role: string;
  }>;
}

function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [calls, setCalls] = useState<{ [key: string]: CallData }>({});
  const [loading, setLoading] = useState(true);
  const [expandedTranscript, setExpandedTranscript] = useState<string | null>(null);
  const [stats, setStats] = useState({
    notCalled: 0,
    called: 0,
    error: 0
  });

  useEffect(() => {
    async function fetchCampaignData() {
      if (!id) return;

      try {
        // Fetch campaign details
        const campaignDoc = await getDoc(doc(db, 'campaigns', id));
        if (!campaignDoc.exists()) {
          throw new Error('Campaign not found');
        }
        setCampaign({ id: campaignDoc.id, ...campaignDoc.data() } as Campaign);

        // Fetch contacts
        const contactsSnapshot = await getDocs(collection(db, `campaigns/${id}/contacts`));
        const contactsData = contactsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Contact[];

        // Calculate stats
        const notCalled = contactsData.filter(c => !c.called).length;
        const called = contactsData.filter(c => c.called && !c.error).length;
        const error = contactsData.filter(c => c.error).length;

        setStats({ notCalled, called, error });
        setContacts(contactsData);

        // Fetch call data for contacts with call_id
        const callIds = contactsData
          .filter(contact => contact.call_id)
          .map(contact => contact.call_id as string);

        if (callIds.length > 0) {
          const callsData: { [key: string]: CallData } = {};
          for (const callId of callIds) {
            const callDoc = await getDoc(doc(db, 'calls', callId));
            if (callDoc.exists()) {
              callsData[callId] = callDoc.data() as CallData;
            }
          }
          setCalls(callsData);
        }
      } catch (error) {
        console.error('Error fetching campaign data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCampaignData();
  }, [id]);

  async function handleEndCampaign() {
    if (!campaign?.id) return;

    try {
      const campaignRef = doc(db, 'campaigns', campaign.id);
      await updateDoc(campaignRef, { status: 'ended' });
      setCampaign(prev => prev ? { ...prev, status: 'ended' } : null);
    } catch (error) {
      console.error('Error ending campaign:', error);
    }
  }

  function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleString();
  }

  function formatDuration(seconds: number) {
    return `${seconds.toFixed(1)}s`;
  }

  function formatTranscript(messages: Array<{ message: string; role: string }>) {
    return messages
      .filter(msg => msg.role === 'bot' || msg.role === 'human')
      .map(msg => `${msg.role === 'bot' ? 'AI' : 'Customer'}: ${msg.message}`)
      .join('\n');
  }

  function downloadContacts(status: 'notCalled' | 'error') {
    const filteredContacts = contacts.filter(contact => {
      if (status === 'notCalled') return !contact.called;
      if (status === 'error') return !!contact.error;
      return false;
    });

    const csvContent = [
      ['Name', 'Phone Number', 'Status', 'Error'],
      ...filteredContacts.map(contact => [
        contact.name || '',
        contact.phone_number,
        status,
        contact.error || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${campaign?.name}_${status}_contacts.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Campaign not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/campaigns')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{campaign.name}</h1>
            <p className="text-sm text-gray-500">
              {new Date(campaign.created_at).toLocaleDateString()} · {campaign.timezone}
            </p>
          </div>
        </div>
        {campaign.status === 'active' && (
          <button
            onClick={handleEndCampaign}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            End Campaign
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-100">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Not Called</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.notCalled}</p>
              </div>
              <Phone className="h-8 w-8 text-gray-400" />
            </div>
            {stats.notCalled > 0 && (
              <button
                onClick={() => downloadContacts('notCalled')}
                className="mt-4 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-900"
              >
                <Download className="h-4 w-4 mr-1" />
                Download List
              </button>
            )}
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-100">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Called</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.called}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-100">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Errors</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.error}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            {stats.error > 0 && (
              <button
                onClick={() => downloadContacts('error')}
                className="mt-4 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-900"
              >
                <Download className="h-4 w-4 mr-1" />
                Download List
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-100">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">Contact List</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent Number
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer Number
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Call Duration
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  End Reason
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recording
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transcript
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {contacts.map((contact) => {
                const callData = contact.call_id ? calls[contact.call_id] : null;
                return (
                  <tr key={contact.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {contact.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {callData ? formatDate(callData.timestamp) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {callData?.phoneNumber?.number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {callData?.customer?.number || contact.phone_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        contact.error ? 'bg-red-100 text-red-800' :
                        contact.called ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {contact.error ? (
                          <XCircle className="h-4 w-4 mr-1" />
                        ) : contact.called ? (
                          <CheckCircle className="h-4 w-4 mr-1" />
                        ) : (
                          <Phone className="h-4 w-4 mr-1" />
                        )}
                        {contact.error ? 'Error' : contact.called ? 'Called' : 'Not Called'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {callData ? formatDuration(callData.durationSeconds) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {callData?.endedReason || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {callData?.recordingUrl ? (
                        <a
                          href={callData.recordingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Listen
                        </a>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {callData?.messages && callData.messages.length > 0 ? (
                        <div className="relative">
                          <button
                            onClick={() => setExpandedTranscript(expandedTranscript === contact.id ? null : contact.id)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            View
                          </button>
                          {expandedTranscript === contact.id && (
                            <div className="absolute z-10 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                              <div className="flex justify-between items-center mb-2">
                                <h4 className="text-sm font-medium">Call Transcript</h4>
                                <button
                                  onClick={() => setExpandedTranscript(null)}
                                  className="text-gray-400 hover:text-gray-500"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </div>
                              <pre className="text-xs whitespace-pre-wrap max-h-60 overflow-y-auto">
                                {formatTranscript(callData.messages)}
                              </pre>
                            </div>
                          )}
                        </div>
                      ) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default CampaignDetailPage;
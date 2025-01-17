import React, { useState, useEffect } from "react";
import { parse } from "papaparse";
import { Plus, Building2, X, Download, Upload, Loader2 } from "lucide-react";
import { db } from "../lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  orderBy,
  query,
  writeBatch,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import type { Campaign } from "../types";

interface Contact {
  name: string;
  phone_number: string;
}

interface NewCampaignFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCampaigns();
  }, []);

  async function fetchCampaigns() {
    try {
      const campaignsQuery = query(
        collection(db, "campaigns"),
        orderBy("created_at", "desc"),
      );
      const snapshot = await getDocs(campaignsQuery);
      const campaignsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Campaign[];
      setCampaigns(campaignsData);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleCampaignClick(campaignId: string) {
    navigate(`/campaigns/${campaignId}`);
  }

  function downloadTemplate() {
    const csvContent =
      "Name,Phone Number,Project Name,Unit Number\nJohn Doe,+1234567890,Palm Jumeirah,123";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contacts_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold text-gray-900">
          Campaign Management
        </h1>
        <div className="flex gap-2">
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Download className="h-4 w-4 mr-1" />
            Download Template
          </button>
          <button
            onClick={() => setShowNewCampaign(true)}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-4 w-4 mr-1" />
            New Campaign
          </button>
        </div>
      </div>

      {showNewCampaign && (
        <NewCampaignForm
          onClose={() => setShowNewCampaign(false)}
          onSuccess={() => {
            setShowNewCampaign(false);
            fetchCampaigns();
          }}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((campaign) => (
          <div
            key={campaign.id}
            onClick={() => handleCampaignClick(campaign.id)}
            className="bg-white shadow-sm rounded-lg border border-gray-100 p-4 cursor-pointer hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  {campaign.name}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {campaign.timezone}
                </p>
                <p className="text-xs text-gray-500">
                  Created: {new Date(campaign.created_at).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(campaign?.campaign_start_date).toLocaleDateString()}{" "}
                  - {new Date(campaign?.campaign_end_date).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-500">
                  Time: {campaign.start_time} - {campaign.end_time}
                </p>
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  campaign.status === "active"
                    ? "bg-green-100 text-green-800"
                    : campaign.status === "ended"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-800"
                }`}
              >
                {campaign.status}
              </span>
            </div>

            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>
                  {Math.round(
                    (campaign.contacts_called / campaign.total_contacts) * 100,
                  )}
                  %
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${(campaign.contacts_called / campaign.total_contacts) * 100}%`,
                  }}
                />
              </div>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-4 text-center">
              <div className="border-r border-gray-100">
                <dt className="text-xs font-medium text-gray-500">
                  Total Contacts
                </dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">
                  {campaign.total_contacts}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">
                  Calls Made
                </dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">
                  {campaign.contacts_called}
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewCampaignForm({ onClose, onSuccess }: NewCampaignFormProps) {
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("Asia/Dubai");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [campaignDate, setCampaignDate] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [campaignStartDate, setCampaignStartDate] = useState("");
  const [campaignEndDate, setCampaignEndDate] = useState("");

  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [selectedAssistantId, setSelectedAssistantId] = useState("");
  const [loadingAssistants, setLoadingAssistants] = useState(true);

  useEffect(() => {
    async function fetchAssistants() {
      try {
        const response = await fetch("https://api.vapi.ai/assistant", {
          headers: {
            Authorization: "Bearer a74661c9-f98f-4af0-afa4-00a0e80ce133",
          },
        });

        if (response.ok) {
          const data = await response.json();
          setAssistants(
            data.map((assistant: any) => ({
              id: assistant.id,
              name: assistant.name,
            })),
          );
        } else {
          setError("Failed to load assistants");
        }
      } catch (error) {
        console.error("Error fetching assistants:", error);
        setError("Failed to load assistants");
      } finally {
        setLoadingAssistants(false);
      }
    }

    fetchAssistants();
  }, []);

  // Get tomorrow's date as the minimum allowed date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate());
  const minDate = tomorrow.toISOString().split("T")[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !name ||
      !timezone ||
      !startTime ||
      !endTime ||
      !campaignStartDate ||
      !campaignEndDate ||
      !selectedAssistantId ||
      contacts.length === 0
    ) {
      setError("Please fill in all fields and upload contacts");
      return;
    }

    try {
      setUploading(true);

      // Create campaign
      const campaignRef = await addDoc(collection(db, "campaigns"), {
        name,
        timezone,
        start_time: startTime,
        end_time: endTime,
        campaign_start_date: campaignStartDate,
        campaign_end_date: campaignEndDate,
        total_contacts: contacts.length,
        contacts_called: 0,
        status: "active",
        created_at: new Date().toISOString(),
        assistantId: selectedAssistantId,
      });

      // Add contacts in batches
      const batch = writeBatch(db);
      contacts.forEach((contact) => {
        const contactRef = doc(
          collection(db, `campaigns/${campaignRef.id}/contacts`),
        );
        batch.set(contactRef, {
          ...contact,
          called: false,
          created_at: new Date().toISOString(),
        });
      });
      await batch.commit();

      // Schedule campaign with the API
      const scheduleResponse = await fetch(
        "https://bulk-back-vapi-chiragguptaatwo.replit.app/campaign/schedule",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            campaign_id: campaignRef.id,
            start_date: campaignStartDate,
            end_date: campaignEndDate,
            start_time: startTime,
            end_time: endTime,
            timezone: timezone,
          }),
        },
      );

      if (!scheduleResponse.ok) {
        throw new Error("Failed to schedule campaign");
      }

      onSuccess();
    } catch (error) {
      console.error("Error creating campaign:", error);
      setError("Failed to create campaign");

      // If campaign was created but scheduling failed, update status to error
      if (
        error instanceof Error &&
        error.message === "Failed to schedule campaign"
      ) {
        let campaignRef;
        try {
          campaignRef = doc(db, "campaigns", campaignRef.id);
          await updateDoc(campaignRef, { status: "error" });
        } catch (updateError) {
          console.error("Error updating campaign status:", updateError);
        }
      }
    } finally {
      setUploading(false);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    parse(file, {
      header: true,
      complete: (results) => {
        const validContacts = results.data
          .filter((row: any) => row["Name"] && row["Phone Number"])
          .map((row: any) => ({
            name: row["Name"],
            phone_number: row["Phone Number"],
            project_name: row["Project Name"] || "",
            unit_number: row["Unit Number"] || "",
          }));
        setContacts(validContacts);
      },
      error: (error) => {
        console.error("Error parsing CSV:", error);
        setError("Failed to parse CSV file");
      },
    });
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">New Campaign</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Campaign Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="timezone"
              className="block text-sm font-medium text-gray-700"
            >
              Timezone
            </label>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="Asia/Dubai">Dubai (GST)</option>
              <option value="Asia/Riyadh">Riyadh (AST)</option>
              <option value="Asia/Qatar">Qatar (AST)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="campaignStartDate"
                className="block text-sm font-medium text-gray-700"
              >
                Start Date
              </label>
              <input
                type="date"
                id="campaignStartDate"
                value={campaignStartDate}
                min={minDate}
                onChange={(e) => setCampaignStartDate(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="campaignEndDate"
                className="block text-sm font-medium text-gray-700"
              >
                End Date
              </label>
              <input
                type="date"
                id="campaignEndDate"
                value={campaignEndDate}
                min={campaignStartDate || minDate}
                onChange={(e) => setCampaignEndDate(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="startTime"
                className="block text-sm font-medium text-gray-700"
              >
                Start Time
              </label>
              <input
                type="time"
                id="startTime"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="endTime"
                className="block text-sm font-medium text-gray-700"
              >
                End Time
              </label>
              <input
                type="time"
                id="endTime"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="assistant"
              className="block text-sm font-medium text-gray-700"
            >
              Assistant
            </label>
            <select
              id="assistant"
              value={selectedAssistantId}
              onChange={(e) => setSelectedAssistantId(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              disabled={loadingAssistants}
            >
              <option value="">Select an assistant</option>
              {assistants.map((assistant) => (
                <option key={assistant.id} value={assistant.id}>
                  {assistant.name}
                </option>
              ))}
            </select>
            {loadingAssistants && (
              <p className="mt-1 text-sm text-gray-500">
                Loading assistants...
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Contact List (CSV)
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                  >
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      accept=".csv"
                      className="sr-only"
                      onChange={handleFileUpload}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">CSV file up to 10MB</p>
              </div>
            </div>
            {contacts.length > 0 && (
              <p className="mt-2 text-sm text-gray-500">
                {contacts.length} contacts loaded
              </p>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Campaign"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CampaignsPage;

import type { Express } from "express";
import type { Server } from "http";
import { storage, sqlite } from "./storage";
import { insertIncidentSchema } from "@shared/schema";
import { runIngestion } from "./ingest";

export async function registerRoutes(server: Server, app: Express) {
  // ==================== PUBLIC API ====================
  
  // Get published incidents (public feed)
  app.get("/api/incidents", (req, res) => {
    const { category, search, starred, limit, offset } = req.query;
    
    const incidents = storage.getIncidents({
      category: category as string,
      status: "published",
      search: search as string,
      starred: starred === "true",
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    });

    const total = storage.getIncidentCount({ 
      category: category as string, 
      status: "published" 
    });

    res.json({ incidents, total });
  });

  // Get single incident
  app.get("/api/incidents/:id", (req, res) => {
    const incident = storage.getIncident(parseInt(req.params.id));
    if (!incident) {
      return res.status(404).json({ error: "Incident not found" });
    }
    res.json(incident);
  });

  // Get stats
  app.get("/api/stats", (_req, res) => {
    const stats = storage.getStats();
    res.json(stats);
  });

  // ==================== ADMIN API ====================
  
  // Get all incidents (admin - includes drafts)
  app.get("/api/admin/incidents", (req, res) => {
    const { category, status, search, limit, offset } = req.query;
    
    const incidents = storage.getIncidents({
      category: category as string,
      status: status as string,
      search: search as string,
      limit: limit ? parseInt(limit as string) : 100,
      offset: offset ? parseInt(offset as string) : 0,
    });

    const total = storage.getIncidentCount({ 
      category: category as string, 
      status: status as string 
    });

    res.json({ incidents, total });
  });

  // Create incident
  app.post("/api/admin/incidents", (req, res) => {
    try {
      const data = insertIncidentSchema.parse({
        ...req.body,
        createdAt: new Date().toISOString(),
      });
      const incident = storage.createIncident(data);
      res.status(201).json(incident);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update incident
  app.patch("/api/admin/incidents/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const updated = storage.updateIncident(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Incident not found" });
    }
    res.json(updated);
  });

  // Delete incident
  app.delete("/api/admin/incidents/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const deleted = storage.deleteIncident(id);
    if (!deleted) {
      return res.status(404).json({ error: "Incident not found" });
    }
    res.json({ deleted: true });
  });

  // Trigger automated ingestion
  app.post("/api/admin/ingest", async (req, res) => {
    try {
      const maxArticles = parseInt(req.query.max as string) || 30;
      const result = await runIngestion(maxArticles);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Bulk import (for automated ingestion)
  app.post("/api/admin/incidents/bulk", (req, res) => {
    const { incidents: items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "Expected array of incidents" });
    }

    const created = [];
    const errors = [];

    for (const item of items) {
      try {
        const data = insertIncidentSchema.parse({
          ...item,
          createdAt: new Date().toISOString(),
          sourceType: "auto",
        });
        const incident = storage.createIncident(data);
        created.push(incident);
      } catch (error: any) {
        errors.push({ item, error: error.message });
      }
    }

    res.json({ created: created.length, errors: errors.length, details: errors });
  });

  // ==================== SITE SETTINGS ====================

  // Get about page content (public)
  app.get("/api/about", (req, res) => {
    const row = sqlite.prepare("SELECT value FROM site_settings WHERE key = 'about_content'").get() as any;
    if (row) {
      res.json(JSON.parse(row.value));
    } else {
      res.json({});
    }
  });

  // Update about page content (admin)
  app.put("/api/admin/about", (req, res) => {
    const content = req.body;
    sqlite.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)").run(
      'about_content',
      JSON.stringify(content)
    );
    res.json({ success: true });
  });
}

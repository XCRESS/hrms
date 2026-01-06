import type { Response } from 'express';
import Policy from '../models/Policy.model.js';
import { formatResponse } from '../utils/response.js';
import logger from '../utils/logger.js';
import type { IAuthRequest } from '../types/index.js';

export const createPolicy = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const {
      title,
      content,
      category,
      priority,
      effectiveDate,
      expiryDate,
      tags,
      acknowledgmentRequired,
      targetAudience,
      attachments
    } = req.body as {
      title: string;
      content: string;
      category?: string;
      priority?: string;
      effectiveDate?: string;
      expiryDate?: string;
      tags?: string[];
      acknowledgmentRequired?: boolean;
      targetAudience?: string;
      attachments?: unknown[];
    };

    if (!title || !content) {
      res.status(400).json(formatResponse(false, 'Title and content are required'));
      return;
    }

    if (!req.user) {
      res.status(401).json(formatResponse(false, 'Authentication required'));
      return;
    }

    const policyData = {
      title: title.trim(),
      content,
      category: category || 'General',
      priority: priority || 'Medium',
      effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      tags: tags || [],
      acknowledgmentRequired: acknowledgmentRequired || false,
      targetAudience: targetAudience || 'All Employees',
      attachments: attachments || [],
      createdBy: req.user._id,
      lastUpdatedBy: req.user._id
    };

    const policy = new Policy(policyData);
    await policy.save();

    await policy.populate('createdBy', 'firstName lastName');

    const createdBy = policy.createdBy as unknown as { firstName: string; lastName: string } | undefined;
    logger.info({ id: policy._id, title: policy.title, category: policy.category, createdBy: createdBy ? `${createdBy.firstName} ${createdBy.lastName}` : 'Unknown' }, 'Policy created successfully');

    res.status(201).json(formatResponse(true, 'Policy created successfully', policy));
  } catch (error) {
    const err = error as { code?: number; message?: string };
    logger.error({ err }, 'Error creating policy');

    if (err.code === 11000) {
      res.status(400).json(formatResponse(false, 'A policy with this title already exists'));
      return;
    }
    res.status(500).json(formatResponse(false, 'Server error while creating policy', err.message));
  }
};

export const getAllPolicies = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '10',
      category,
      priority,
      targetAudience,
      isActive,
      search
    } = req.query;

    const filter: {
      category?: string;
      priority?: string;
      targetAudience?: string;
      isActive?: boolean;
      $or?: Array<{ title?: { $regex: string; $options: string }; content?: { $regex: string; $options: string }; tags?: { $in: RegExp[] } }>;
    } = {};

    if (category && typeof category === 'string') filter.category = category;
    if (priority && typeof priority === 'string') filter.priority = priority;
    if (targetAudience && typeof targetAudience === 'string') filter.targetAudience = targetAudience;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    if (search && typeof search === 'string') {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const pageNum = parseInt(typeof page === 'string' ? page : '1', 10);
    const limitNum = parseInt(typeof limit === 'string' ? limit : '10', 10);
    const skip = (pageNum - 1) * limitNum;

    const [policies, total] = await Promise.all([
      Policy.find(filter)
        .populate('createdBy', 'firstName lastName')
        .populate('lastUpdatedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Policy.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limitNum);

    const response = {
      policies,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum
      }
    };

    res.status(200).json(formatResponse(true, 'Policies fetched successfully', response));
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error fetching policies');
    res.status(500).json(formatResponse(false, 'Server error while fetching policies', err.message));
  }
};

export const getActivePolicies = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { limit = '5', targetAudience } = req.query;

    const options: { limit: number; targetAudience?: string } = {
      limit: parseInt(typeof limit === 'string' ? limit : '5', 10)
    };

    if (typeof targetAudience === 'string') {
      options.targetAudience = targetAudience;
    }

    const policies = await Policy.getActivePolicies(options as { limit: number });

    res.status(200).json(formatResponse(true, 'Active policies fetched successfully', policies));
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error fetching active policies');
    res.status(500).json(formatResponse(false, 'Server error while fetching active policies', err.message));
  }
};

export const getPolicyById = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const policy = await Policy.findById(id)
      .populate('createdBy', 'firstName lastName')
      .populate('lastUpdatedBy', 'firstName lastName');

    if (!policy) {
      res.status(404).json(formatResponse(false, 'Policy not found'));
      return;
    }

    res.status(200).json(formatResponse(true, 'Policy fetched successfully', policy));
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error fetching policy');
    res.status(500).json(formatResponse(false, 'Server error while fetching policy', err.message));
  }
};

export const updatePolicy = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: Record<string, unknown> = { ...req.body };

    delete updateData.createdBy;
    delete updateData.createdAt;
    delete updateData.version;

    if (!req.user) {
      res.status(401).json(formatResponse(false, 'Authentication required'));
      return;
    }

    updateData.lastUpdatedBy = req.user._id;

    const existingPolicy = await Policy.findById(id);
    if (!existingPolicy) {
      res.status(404).json(formatResponse(false, 'Policy not found'));
      return;
    }

    if (updateData.content && updateData.content !== existingPolicy.content) {
      updateData.version = existingPolicy.version + 1;
    }

    const policy = await Policy.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName')
     .populate('lastUpdatedBy', 'firstName lastName');

    if (!policy) {
      res.status(404).json(formatResponse(false, 'Policy not found after update'));
      return;
    }

    const lastUpdatedBy = policy.lastUpdatedBy as unknown as { firstName: string; lastName: string } | undefined;
    logger.info({ id: policy._id, title: policy.title, version: policy.version, updatedBy: lastUpdatedBy ? `${lastUpdatedBy.firstName} ${lastUpdatedBy.lastName}` : 'Unknown' }, 'Policy updated successfully');

    res.status(200).json(formatResponse(true, 'Policy updated successfully', policy));
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error updating policy');
    res.status(500).json(formatResponse(false, 'Server error while updating policy', err.message));
  }
};

export const deletePolicy = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.user) {
      res.status(401).json(formatResponse(false, 'Authentication required'));
      return;
    }

    const policy = await Policy.findByIdAndUpdate(
      id,
      {
        isActive: false,
        lastUpdatedBy: req.user._id
      },
      { new: true }
    );

    if (!policy) {
      res.status(404).json(formatResponse(false, 'Policy not found'));
      return;
    }

    logger.info({ id: policy._id, title: policy.title }, 'Policy deleted (soft delete) successfully');

    res.status(200).json(formatResponse(true, 'Policy deleted successfully'));
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error deleting policy');
    res.status(500).json(formatResponse(false, 'Server error while deleting policy', err.message));
  }
};

export const permanentDeletePolicy = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const policy = await Policy.findById(id);
    if (!policy) {
      res.status(404).json(formatResponse(false, 'Policy not found'));
      return;
    }

    if (policy.isActive) {
      res.status(400).json(formatResponse(false, 'Cannot permanently delete active policies. Please deactivate first.'));
      return;
    }

    await Policy.findByIdAndDelete(id);

    logger.info({ id: policy._id, title: policy.title }, 'Policy permanently deleted successfully');

    res.status(200).json(formatResponse(true, 'Policy permanently deleted successfully'));
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error permanently deleting policy');
    res.status(500).json(formatResponse(false, 'Server error while permanently deleting policy', err.message));
  }
};

export const getPolicyStatistics = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const [
      totalPolicies,
      activePolicies,
      policiesByCategory,
      policiesByPriority,
      recentPolicies
    ] = await Promise.all([
      Policy.countDocuments({}),
      Policy.countDocuments({ isActive: true }),
      Policy.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Policy.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Policy.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('createdBy', 'firstName lastName')
    ]);

    const statistics = {
      overview: {
        totalPolicies,
        activePolicies,
        inactivePolicies: totalPolicies - activePolicies
      },
      distribution: {
        byCategory: policiesByCategory,
        byPriority: policiesByPriority
      },
      recent: recentPolicies
    };

    res.status(200).json(formatResponse(true, 'Policy statistics fetched successfully', statistics));
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error fetching policy statistics');
    res.status(500).json(formatResponse(false, 'Server error while fetching statistics', err.message));
  }
};

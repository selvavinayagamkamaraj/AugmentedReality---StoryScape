using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System.Runtime.InteropServices;

namespace StoryAR.Unity
{
    [Serializable]
    public class StoryDataDTO
    {
        public string title;
        public string summary;
        public List<StoryCharacterDTO> characters;
        public List<StoryObjectDTO> objects;
    }

    [Serializable]
    public class StoryCharacterDTO
    {
        public string id;
        public string name;
        public string type;
        public string color;
        public float initialScale;
    }

    [Serializable]
    public class StoryObjectDTO
    {
        public string id;
        public string name;
        public string type;
        public float scale;
        public string surfaceAnchor;
    }

    [Serializable]
    public class SurfaceListDTO
    {
        public List<SurfaceDTO> surfaces;
    }

    [Serializable]
    public class SurfaceDTO
    {
        public string id;
        public string type;
        public float height;
        public Vector3 position;
        public float confidence;
    }

    [Serializable]
    public class LightingDTO
    {
        public float intensity;
        public float[] direction;
        public string ambientColor;
        public float temperature;
    }

    [Serializable]
    public class CharacterActionDTO
    {
        public string characterId;
        public string action;
        public Vector3 targetPosition;
        public string targetSurface;
        public string targetObjectId;
        public float duration;
    }

    public class StoryBridge : MonoBehaviour
    {
        public static StoryBridge Instance { get; private set; }

        [Header("System References")]
        [SerializeField] private CharacterManager characterManager;
        [SerializeField] private RoomLightingController lightingController;
        [SerializeField] private SurfaceManager surfaceManager;

        #if UNITY_WEBGL && !UNITY_EDITOR
        [DllImport("__Internal")]
        private static extern void StoryAR_DispatchEvent(string eventName, string jsonPayload);
        #endif

        private void Awake()
        {
            if (Instance == null) Instance = this;
            else Destroy(gameObject);
            DontDestroyOnLoad(gameObject);
        }

        private void Start()
        {
            NotifyWeb("OnUnityReady", "{}");
        }

        // Called from JavaScript: unityInstance.SendMessage("StoryBridge", "OnReceiveStory", json)
        public void OnReceiveStory(string json)
        {
            try
            {
                var story = JsonUtility.FromJson<StoryDataDTO>(json);
                if (characterManager != null && story != null)
                {
                    characterManager.SpawnStoryCharacters(story.characters);
                }
                NotifyWeb("OnStoryInitialized", json);
            }
            catch (Exception ex)
            {
                Debug.LogError($"[StoryBridge] Error parsing story: {ex.Message}");
            }
        }

        // Called from JavaScript: unityInstance.SendMessage("StoryBridge", "OnUpdateSurfaces", json)
        public void OnUpdateSurfaces(string json)
        {
            try
            {
                var list = JsonUtility.FromJson<SurfaceListDTO>(json);
                if (surfaceManager != null && list != null)
                {
                    surfaceManager.UpdateSurfaces(list.surfaces);
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[StoryBridge] Error parsing surfaces: {ex.Message}");
            }
        }

        // Called from JavaScript: unityInstance.SendMessage("StoryBridge", "OnUpdateLighting", json)
        public void OnUpdateLighting(string json)
        {
            try
            {
                var lighting = JsonUtility.FromJson<LightingDTO>(json);
                if (lightingController != null && lighting != null)
                {
                    lightingController.ApplyRoomLighting(lighting);
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[StoryBridge] Error parsing lighting: {ex.Message}");
            }
        }

        // Called from JavaScript: unityInstance.SendMessage("StoryBridge", "OnExecuteAction", json)
        public void OnExecuteAction(string json)
        {
            try
            {
                var action = JsonUtility.FromJson<CharacterActionDTO>(json);
                if (characterManager != null && action != null)
                {
                    characterManager.ExecuteAction(action);
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[StoryBridge] Error executing action: {ex.Message}");
            }
        }

        public void NotifyWeb(string eventName, string jsonPayload)
        {
            #if UNITY_WEBGL && !UNITY_EDITOR
            StoryAR_DispatchEvent(eventName, jsonPayload);
            #else
            Debug.Log($"[StoryBridge -> Web] Event: {eventName}, Payload: {jsonPayload}");
            #endif
        }
    }
}
